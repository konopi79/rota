import { angleTo, ease } from './math'

/**
 * Feet that carry the body — the rule the author set: any move of the body is made by the
 * legs. A planted foot stays where it is on the ground, whatever the body above it does;
 * when the body moves or turns away from where a foot belongs, the foot lifts and steps to
 * where it will belong by the time it lands. The legs are then solved to reach the feet
 * (`handler.ts`, `dog.ts`).
 */

/** A body on the field: where it is and which way it faces (heading 0 = +z). */
export type Body = { x: number; z: number; heading: number }

export type FootSpec = {
  name: string
  /** Where the foot stands under a still body, in the body's frame (x left, z ahead). */
  neutral: readonly [number, number]
  /** Its place in the step cycle (0–1): which feet move together and in what order. */
  offset: number
}

export type StepGait = {
  /** Share of the cycle a foot is on the ground. */
  stance: number
  /** Metres the body moves in one step cycle. */
  cycleLength: number
  /** How high a full step lifts the foot, metres. */
  clearance: number
  /** Turning on the spot counts as walking this many metres per radian. */
  turnLength: number
  /** Moving sideways counts this many times over: legs take short steps to the side. */
  sideways: number
  /**
   * Walking on, the feet land this much further back than where they stand still, metres:
   * a person's heel lands just ahead of the hips and pushes off far behind them.
   */
  backShift?: number
  /** A planted foot this far from where it belongs, in half strides, steps at once. */
  reach?: number
  /** ...as long as this many other feet stay on the ground (default one). */
  support?: number
  /** Sideways a leg reaches this share of its reach ahead or back. */
  reachAside?: number
}

export type FootState = {
  /** The foot's point on the ground (world), how high it is and which way it points. */
  x: number
  z: number
  lift: number
  yaw: number
  /** Swing progress 0–1, or null while the foot is planted. */
  swing: number | null
  /** Stance progress 0–1 while planted. */
  stance: number
  /** Length of the current or last step, metres. */
  step: number
}

/** Where a foot belongs under a body. */
const placeUnder = (body: Body, [x, z]: readonly [number, number]) => ({
  x: body.x + x * Math.cos(body.heading) + z * Math.sin(body.heading),
  z: body.z - x * Math.sin(body.heading) + z * Math.cos(body.heading),
})

/** A still body puts its feet down in place at this pace, m/s of equivalent walking. */
const SETTLE_SPEED = 0.6
/** A foot this close to where it belongs needs no step. */
const SETTLED_DISTANCE = 0.015
const SETTLED_YAW = 0.06
/** Feet look this far ahead at most, seconds (a body setting off or slowing to a stop). */
const MAX_LOOKAHEAD = 1.5

const frac = (x: number) => x - Math.floor(x)

/** By default a planted foot this far from where it belongs (in half strides) must step. */
const REACH = 1.25
/** By default a leg reaches sideways this share of its reach ahead or back. */
const REACH_ASIDE = 0.6
/** A foot out of step with its gait catches up by up to this share of a cycle per cycle. */
const CATCH_UP = 0.25

/** `x` wrapped into [−0.5, 0.5). */
const wrap = (x: number) => x - Math.floor(x + 0.5)

export class Stepper {
  private phase = 0
  /**
   * Each foot's own lag or lead in the cycle. A gait has its feet move in a set order; when
   * the gait changes, or a foot must step early to stay within its leg's reach, a foot runs
   * out of that order for a while and catches up step by step.
   */
  private delta: number[]
  /** Standing still with every foot where it belongs. */
  private settled = true
  private last: Body
  private state: FootState[]
  /** Where a swinging foot lifted off. */
  private from: { x: number; z: number; yaw: number }[]

  constructor(
    private specs: readonly FootSpec[],
    body: Body,
  ) {
    this.last = { ...body }
    this.state = specs.map((s) => ({
      ...placeUnder(body, s.neutral),
      lift: 0,
      yaw: body.heading,
      swing: null,
      stance: 0,
      step: 0,
    }))
    this.from = this.state.map((f) => ({ ...f }))
    this.delta = specs.map(() => 0)
  }

  /** Put every foot down where it is now (after the legs were posed some other way). */
  plant(feet: { x: number; z: number; yaw: number }[], body: Body) {
    this.state = this.state.map((f, i) => ({ ...f, ...feet[i]!, lift: 0, swing: null }))
    this.last = { ...body }
  }

  /** The feet's step cycle, for what swings along with it (arms). */
  get cycle() {
    return this.phase
  }

  /** Where the feet are now. */
  get feet(): readonly FootState[] {
    return this.state
  }

  /**
   * Another gait for the same feet (walk ↔ trot): which feet move together changes. Every
   * foot carries on from where it is in its step and falls in with the new order gradually.
   */
  setFeet(specs: readonly FootSpec[]) {
    this.delta = this.delta.map((d, i) => d + (this.specs[i]!.offset - specs[i]!.offset))
    this.specs = specs
  }

  private local(i: number) {
    return frac(this.phase + this.specs[i]!.offset + this.delta[i]!)
  }

  /**
   * Setting off from a stand, every foot is where it belongs. A foot early in its stance
   * would stay down for most of a stride and fall out of its leg's reach, so the cycle
   * starts where every planted foot is at least 40 % into its stance — the first step is a
   * half step, as a dog's or a person's is.
   */
  private startingPhase(gait: StepGait) {
    let best = 0
    let bestMargin = -Infinity
    for (let i = 0; i < 100; i++) {
      const phase = i / 100
      const margin = Math.min(
        ...this.specs.map((s) => {
          const local = frac(phase + s.offset)
          return local < gait.stance ? local / gait.stance : 1
        }),
      )
      if (margin > bestMargin) [best, bestMargin] = [phase, margin]
    }
    return best
  }

  update(dt: number, body: Body, gait: StepGait): FootState[] {
    const dx = body.x - this.last.x
    const dz = body.z - this.last.z
    const turn = angleTo(this.last.heading, body.heading)
    this.last = { ...body }
    // Ahead and sideways in the body's own frame: sideways steps are short.
    const ahead = dx * Math.sin(body.heading) + dz * Math.cos(body.heading)
    const aside = dx * Math.cos(body.heading) - dz * Math.sin(body.heading)
    let travel = Math.hypot(ahead, aside * gait.sideways) + Math.abs(turn) * gait.turnLength
    let vx = dt > 0 ? dx / dt : 0
    let vz = dt > 0 ? dz / dt : 0
    let spin = dt > 0 ? turn / dt : 0

    // The body has stopped: the feet that are not where they belong step there, then all
    // stand still.
    if (travel < 1e-5 * Math.max(dt * 60, 1)) {
      const unsettled = this.state.some((f, i) => {
        if (f.swing !== null) return true
        const home = placeUnder(body, this.specs[i]!.neutral)
        return (
          Math.hypot(f.x - home.x, f.z - home.z) > SETTLED_DISTANCE ||
          Math.abs(angleTo(f.yaw, body.heading)) > SETTLED_YAW
        )
      })
      if (!unsettled) {
        this.settled = true
        return this.state
      }
      travel = SETTLE_SPEED * dt
      vx = vz = spin = 0
    }

    if (this.settled) {
      this.phase = this.startingPhase(gait)
      this.delta = this.delta.map(() => 0)
    }
    this.settled = false
    const advance = travel / gait.cycleLength
    this.phase += advance
    const rate = dt > 0 ? advance / dt : 0 // cycles per second
    const half = (gait.stance * gait.cycleLength) / 2
    const c = Math.cos(body.heading)
    const s = Math.sin(body.heading)
    // Walking on at a good pace, the footfalls move back (`backShift`).
    const forward = vx * s + vz * c
    const back = (gait.backShift ?? 0) * Math.min(1, Math.max(0, forward / 0.6))

    this.state = this.state.map((foot, i) => {
      const spec = this.specs[i]!
      if (foot.swing === null) {
        // A planted foot falls in with the gait's order...
        const d = wrap(this.delta[i]!)
        this.delta[i] = d - Math.sign(d) * Math.min(Math.abs(d), CATCH_UP * advance)
        // ...but steps at once when the body has carried it out of its leg's reach.
        const home = placeUnder(body, [spec.neutral[0], spec.neutral[1] - back])
        const offX = c * (foot.x - home.x) - s * (foot.z - home.z)
        const offZ = s * (foot.x - home.x) + c * (foot.z - home.z)
        const local = this.local(i)
        const others = this.state.filter((f, k) => k !== i && f.swing === null).length
        const stretched =
          Math.hypot(offZ / half, offX / (half * (gait.reachAside ?? REACH_ASIDE))) >
          (gait.reach ?? REACH)
        if (local < gait.stance && stretched && others >= (gait.support ?? 1))
          this.delta[i]! += gait.stance - local
      }
      const local = this.local(i)
      if (local < gait.stance) {
        // On the ground: it stays put.
        return { ...foot, lift: 0, swing: null, stance: local / gait.stance }
      }
      const progress = (local - gait.stance) / (1 - gait.stance)
      if (foot.swing === null) this.from[i] = { x: foot.x, z: foot.z, yaw: foot.yaw }
      const from = this.from[i]!
      // Where the foot belongs at the middle of its next stance, the body going on as now.
      const lookahead = Math.min(
        rate > 0 ? ((1 - progress) * (1 - gait.stance) + gait.stance / 2) / rate : 0,
        MAX_LOOKAHEAD,
      )
      const future: Body = {
        x: body.x + vx * lookahead,
        z: body.z + vz * lookahead,
        heading: body.heading + spin * lookahead,
      }
      const target = placeUnder(future, [spec.neutral[0], spec.neutral[1] - back])
      const step = Math.hypot(target.x - from.x, target.z - from.z)
      const k = ease(progress)
      return {
        x: from.x + (target.x - from.x) * k,
        z: from.z + (target.z - from.z) * k,
        yaw: from.yaw + angleTo(from.yaw, future.heading) * k,
        // Short steps (shuffling round on the spot) lift less than full ones.
        lift: gait.clearance * Math.sin(Math.PI * progress) * Math.min(1, step / 0.15 + 0.2),
        swing: progress,
        stance: 0,
        step,
      }
    })
    return this.state
  }
}

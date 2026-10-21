import { angleTo, ease } from './math'

/**
 * Feet that carry the body — the rule the author set: any move of the body is made by the
 * legs. A planted foot stays where it is on the ground, whatever the body above it does
 * (it may only turn on the spot, on its heel or pads); when the body moves or turns away
 * from where a foot belongs, the foot lifts and steps to where it will belong by the time
 * it lands. The legs are then solved to reach the feet (`handler.ts`, `dog.ts`).
 *
 * Every foot keeps its own step cycle, driven by how far its own place moves: walking
 * straight they all move alike and keep the gait's order (trot, walk, left-right), turning
 * the feet far from the turn step more and the ones near it only shuffle round.
 */

/** A body on the field: where it is and which way it faces (heading 0 = +z). */
export type Body = { x: number; z: number; heading: number }

export type FootSpec = {
  name: string
  /** Where the foot stands under a still body, in the body's frame (x left, z ahead). */
  neutral: readonly [number, number]
  /** Its place in the step cycle (0–1): which feet move together and in what order. */
  offset: number
  /** Feet of one pair keep one rhythm (a trot's diagonals), set by the one with most to go. */
  pair?: number
}

export type StepGait = {
  /** Share of the cycle a foot is on the ground. */
  stance: number
  /** Metres the body moves in one step cycle. */
  cycleLength: number
  /** How high a full step lifts the foot, metres. */
  clearance: number
  /** Turning counts as walking this many metres per radian. */
  turnLength: number
  /** Moving sideways counts this many times over: legs take short steps to the side. */
  sideways: number
  /** The longest a step in the air takes, seconds: a lifted foot is put down promptly. */
  swingTime: number
  /**
   * Walking on, the feet land this much further back than where they stand still, metres:
   * a person's heel lands just ahead of the hips and pushes off far behind them.
   */
  backShift?: number
  /** A planted foot this far from where it belongs, in half strides, steps at once... */
  reach?: number
  /** ...as long as this many other feet stay on the ground (default one). */
  support?: number
  /** Sideways a leg reaches this share of its reach ahead or back. */
  reachAside?: number
  /** A planted foot turns on the spot to stay within this angle of the body, radians. */
  pivot?: number
  /**
   * The feet share one rhythm (a person: left, right, left…), set by the foot that has
   * furthest to go — turning, the outer foot takes longer steps, not more of them. Without
   * it each foot (a dog's paw) steps as often as its own place moves.
   */
  shared?: boolean
  /** How fast a foot out of the gait's order falls back in, share of a cycle per cycle. */
  catchUp?: number
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

/** Below this the body counts as standing: the feet finish their steps and close up. */
const STILL_SPEED = 0.05
const STILL_SPIN = 0.15
/** A standing body puts its feet in place at this pace, m/s of equivalent walking. */
const SETTLE_SPEED = 0.8
/**
 * Standing, a foot this close to where it belongs needs no step: a stop is one closing step
 * (the feet parallel, side by side), not shuffling into place.
 */
const SETTLED_DISTANCE = 0.06
const SETTLED_YAW = 0.15
/** Feet look this far ahead at most, seconds (a body setting off or slowing to a stop)... */
const MAX_LOOKAHEAD = 4
/** ...and expect the body to keep turning this long at most. */
const MAX_TURN_LOOKAHEAD = 0.5
/** By default a planted foot this far from where it belongs (in half strides) must step. */
const REACH = 1.25
/** By default a leg reaches sideways this share of its reach ahead or back. */
const REACH_ASIDE = 0.6
/** By default a foot out of its gait's order catches up this share of a cycle per cycle. */
const CATCH_UP = 0.25

const frac = (x: number) => x - Math.floor(x)
/** `x` kept within ±`limit`. */
const clamp = (x: number, limit: number) => Math.max(-limit, Math.min(limit, x))
/** `x` wrapped into [−0.5, 0.5). */
const wrap = (x: number) => x - Math.floor(x + 0.5)

export class Stepper {
  /** The gait's reference cycle, driven by the body's own motion. */
  private phase = 0
  /** Each foot's own cycle. */
  private footPhase: number[]
  /** Standing still with every foot where it belongs. */
  private settled = true
  /** The stride and the way of moving last frame: a change re-times the planted feet. */
  private lastCycle = 0
  private lastStraight = true
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
    this.footPhase = specs.map((s) => s.offset)
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

  /** Standing still, every foot in place. */
  get still() {
    return this.settled
  }

  /** Another gait for the same feet (walk ↔ trot): the feet fall in with its order. */
  setFeet(specs: readonly FootSpec[]) {
    this.specs = specs
  }

  /**
   * Setting off from a stand, every foot is where it belongs. A foot early in its stance
   * would stay down for most of a stride and fall out of its leg's reach, so the cycle
   * starts where every planted foot is well into its stance — the first step is a half
   * step, as a dog's or a person's is.
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

  /**
   * `rest`: where the body will come to a stand, when it is stopping — the last steps land
   * right there, so a stop is the last step and the other foot closing up beside it.
   */
  update(dt: number, body: Body, gait: StepGait, rest?: Body): FootState[] {
    const prev = this.last
    this.last = { ...body }
    const c = Math.cos(body.heading)
    const s = Math.sin(body.heading)
    const dx = body.x - prev.x
    const dz = body.z - prev.z
    const turn = angleTo(prev.heading, body.heading)
    const vx = dt > 0 ? dx / dt : 0
    const vz = dt > 0 ? dz / dt : 0
    const spin = dt > 0 ? turn / dt : 0
    const still = Math.hypot(vx, vz) < STILL_SPEED && Math.abs(spin) < STILL_SPIN
    // Walking on at a good pace, the footfalls move back (`backShift`).
    const back = (gait.backShift ?? 0) * Math.min(1, Math.max(0, (vx * s + vz * c) / 0.6))
    const homes = this.specs.map((spec) => [spec.neutral[0], spec.neutral[1] - back] as const)

    const unsettled = this.state.map((f, i) => {
      if (f.swing !== null) return true
      const home = placeUnder(body, homes[i]!)
      return (
        Math.hypot(f.x - home.x, f.z - home.z) > SETTLED_DISTANCE ||
        Math.abs(angleTo(f.yaw, body.heading)) > SETTLED_YAW
      )
    })
    if (still && !unsettled.some(Boolean)) {
      this.settled = true
      return this.state
    }
    const startedNow = this.settled
    if (this.settled) {
      this.phase = this.startingPhase(gait)
      this.footPhase = this.specs.map((spec) => this.phase + spec.offset)
    }
    // Come to a stand, the foot furthest out of place steps in at once — one at a time.
    if (still && this.state.every((f) => f.swing === null)) {
      let worst = -1
      let worstOff = 0
      this.state.forEach((f, i) => {
        if (!unsettled[i]) return
        const home = placeUnder(body, homes[i]!)
        const off = Math.hypot(f.x - home.x, f.z - home.z)
        if (off >= worstOff) [worst, worstOff] = [i, off]
      })
      if (worst >= 0) {
        const local = frac(this.footPhase[worst]!)
        if (local < gait.stance) this.footPhase[worst]! += gait.stance - local
      }
    }
    this.settled = false

    // How far a place under the body moves this frame, in the body's own frame: ahead,
    // sideways (short steps) and the turn.
    const travelOf = (fromX: number, fromZ: number, toX: number, toZ: number) => {
      const ax = toX - fromX
      const az = toZ - fromZ
      return Math.hypot(ax * s + az * c, (ax * c - az * s) * gait.sideways, turn * gait.turnLength)
    }
    const bodyAdvance = travelOf(prev.x, prev.z, body.x, body.z) / gait.cycleLength
    // 1 walking straight on, 0 turning on the spot.
    const linear = Math.hypot(dx, dz)
    const straight = linear / (linear + Math.abs(turn) * gait.turnLength * 4 + 1e-9)
    // The stride changed (another pace) or the body set off walking from turning on the spot:
    // each planted foot's place in its stance is read off where it actually stands — a foot
    // already behind is late in its stance and lifts soon.
    const walkingOn = straight > 0.7
    if (
      !still &&
      !startedNow &&
      (Math.abs(gait.cycleLength - this.lastCycle) > 1e-6 || (walkingOn && !this.lastStraight))
    ) {
      const half = (gait.stance * gait.cycleLength) / 2
      const placed = this.state.map((f, i) => {
        if (f.swing !== null) return null
        const home = placeUnder(body, homes[i]!)
        const along = (f.x - home.x) * s + (f.z - home.z) * c
        return Math.min(0.95, Math.max(0, (half - along) / (2 * half))) * gait.stance
      })
      if (gait.shared) {
        // One rhythm: set by the planted foot furthest behind, the others in their order.
        let lead = -1
        placed.forEach((local, i) => {
          if (local !== null && (lead < 0 || local > placed[lead]!)) lead = i
        })
        if (lead >= 0) {
          this.phase = Math.floor(this.phase) + placed[lead]! - this.specs[lead]!.offset
          this.footPhase = this.footPhase.map((p, i) =>
            this.state[i]!.swing === null ? this.phase + this.specs[i]!.offset : p,
          )
        }
      } else
        placed.forEach((local, i) => {
          if (local !== null) this.footPhase[i] = Math.floor(this.footPhase[i]!) + local
        })
    }
    this.lastCycle = gait.cycleLength
    if (!still) this.lastStraight = walkingOn
    this.phase += bodyAdvance
    const half = (gait.stance * gait.cycleLength) / 2
    const support = gait.support ?? 1
    // How far each foot's place moves; feet sharing a rhythm take the most of theirs.
    const ownTravel = homes.map((h) => {
      const now = placeUnder(body, h)
      const before = placeUnder(prev, h)
      return travelOf(before.x, before.z, now.x, now.z) / gait.cycleLength
    })
    const rhythm = ownTravel.map((t, i) => {
      if (gait.shared) return Math.max(...ownTravel)
      const pair = this.specs[i]!.pair
      if (pair === undefined) return t
      return Math.max(...ownTravel.filter((_, k) => this.specs[k]!.pair === pair))
    })

    this.state = this.state.map((foot, i) => {
      const spec = this.specs[i]!
      const home = placeUnder(body, homes[i]!)
      const before = placeUnder(prev, homes[i]!)
      const own = still ? (unsettled[i] ? (SETTLE_SPEED * dt) / gait.cycleLength : 0) : rhythm[i]!
      let advance = own
      const othersDown = this.state.filter((f, k) => k !== i && f.swing === null).length

      if (foot.swing === null) {
        // A planted foot falls in with the gait's order...
        const diff = wrap(this.phase + spec.offset - this.footPhase[i]!)
        // ...the more so the straighter the body goes: turning, each paw keeps to itself (a
        // person keeps left, right, left… always).
        const pull =
          (gait.catchUp ?? CATCH_UP) * Math.max(bodyAdvance, advance) * (gait.shared ? 1 : straight)
        this.footPhase[i]! += Math.sign(diff) * Math.min(Math.abs(diff), pull)
        // ...steps at once when the body has carried it out of its leg's reach...
        const offX = c * (foot.x - home.x) - s * (foot.z - home.z)
        const offZ = s * (foot.x - home.x) + c * (foot.z - home.z)
        const aside = half * (gait.reachAside ?? REACH_ASIDE)
        const local = frac(this.footPhase[i]!)
        if (
          local < gait.stance &&
          Math.hypot(offZ / half, offX / aside) > (gait.reach ?? REACH) &&
          othersDown >= support
        )
          this.footPhase[i]! += gait.stance - local
        // ...but never lifts while too few other feet carry the body.
        const next = frac(this.footPhase[i]! + advance)
        if (next >= gait.stance && othersDown < support)
          advance = Math.max(0, gait.stance - 1e-6 - frac(this.footPhase[i]!))
      } else {
        // A foot in the air is put down promptly, whatever the body does.
        advance = Math.max(advance, ((1 - gait.stance) * dt) / gait.swingTime)
      }
      this.footPhase[i]! += advance
      const local = frac(this.footPhase[i]!)

      if (local < gait.stance) {
        // On the ground: it stays put, turning on the spot at most to keep within reach of
        // the body's direction.
        let yaw = foot.yaw
        const turned = angleTo(body.heading, yaw)
        if (gait.pivot !== undefined && Math.abs(turned) > gait.pivot)
          yaw = body.heading + Math.sign(turned) * gait.pivot
        return { ...foot, yaw, lift: 0, swing: null, stance: local / gait.stance }
      }

      const progress = (local - gait.stance) / (1 - gait.stance)
      if (foot.swing === null) this.from[i] = { x: foot.x, z: foot.z, yaw: foot.yaw }
      const from = this.from[i]!
      // Where the foot belongs at the middle of its next stance, the body going on as now:
      // the rest of the swing at its own pace, half the stance at the body's.
      const swingRate = dt > 0 ? advance / dt : 0
      const bodyRate = dt > 0 ? own / dt : 0
      const lookahead = still
        ? 0
        : Math.min(
            (swingRate > 0 ? ((1 - progress) * (1 - gait.stance)) / swingRate : 0) +
              (bodyRate > 0 ? gait.stance / 2 / bodyRate : MAX_LOOKAHEAD),
            MAX_LOOKAHEAD,
          )
      const future: Body = {
        x: body.x + vx * lookahead,
        z: body.z + vz * lookahead,
        heading: body.heading + spin * Math.min(lookahead, MAX_TURN_LOOKAHEAD),
      }
      const target = rest ? placeUnder(rest, this.specs[i]!.neutral) : placeUnder(future, homes[i]!)
      const step = Math.hypot(target.x - from.x, target.z - from.z)
      const k = ease(progress)
      return {
        x: from.x + (target.x - from.x) * k,
        z: from.z + (target.z - from.z) * k,
        yaw: from.yaw + angleTo(from.yaw, future.heading) * k,
        // Short steps (closing up, shuffling round) lift less than full ones.
        lift: gait.clearance * Math.sin(Math.PI * progress) * Math.min(1, step / 0.15 + 0.2),
        swing: progress,
        stance: 0,
        step,
      }
    })
    return this.state
  }
}

/** A paw steps once it is this far (in strides) from where it would land now. */
const PAW_TRIGGER = 0.85
/** Standing, a paw this far from where it belongs is put right. */
const PAW_SETTLE = 0.02
/** Past this (in strides) a paw steps even if that leaves fewer paws down than usual. */
const PAW_URGENT = 1.05

type Swing = { from: { x: number; z: number; yaw: number }; time: number; step: number }

/**
 * A dog's paws, stepping when they must — the way a dog moves. A paw stays down until the
 * body has carried it to the edge of its comfortable reach (back, sideways or turned), then
 * lifts and lands where the body will want it, a little ahead. Never more than two paws
 * are in the air. Trotting, a diagonal pair lifts together; going straight the trot falls
 * out of that by itself, turning the paws near the turn barely move and the others step.
 */
export class PawStepper {
  private last: Body
  private state: FootState[]
  private swings: (Swing | null)[]
  private travelled = 0

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
    this.swings = specs.map(() => null)
  }

  /** Put every paw down where it is now (after the legs were posed some other way). */
  plant(feet: { x: number; z: number; yaw: number }[], body: Body) {
    this.state = this.state.map((f, i) => ({ ...f, ...feet[i]!, lift: 0, swing: null }))
    this.swings = this.swings.map(() => null)
    this.last = { ...body }
  }

  /** How far the body has come, in strides (for what moves along: the tail). */
  get cycle() {
    return this.travelled
  }

  get feet(): readonly FootState[] {
    return this.state
  }

  setFeet(specs: readonly FootSpec[]) {
    this.specs = specs
  }

  update(dt: number, body: Body, gait: StepGait): FootState[] {
    const prev = this.last
    this.last = { ...body }
    const c = Math.cos(body.heading)
    const s = Math.sin(body.heading)
    const vx = dt > 0 ? (body.x - prev.x) / dt : 0
    const vz = dt > 0 ? (body.z - prev.z) / dt : 0
    const spin = dt > 0 ? angleTo(prev.heading, body.heading) / dt : 0
    const speed = Math.hypot(vx, vz)
    const still = speed < STILL_SPEED && Math.abs(spin) < STILL_SPIN
    const stride = gait.stance * gait.cycleLength
    this.travelled += (speed * dt) / gait.cycleLength
    const aside = gait.reachAside ?? REACH_ASIDE
    const support = gait.support ?? 2
    // How fast each paw's place moves (turning, the far paws' places move most).
    const homeVelocity = this.specs.map((spec) => {
      const now = placeUnder(body, spec.neutral)
      const before = placeUnder(prev, spec.neutral)
      return dt > 0 ? { x: (now.x - before.x) / dt, z: (now.z - before.z) / dt } : { x: 0, z: 0 }
    })
    // A faster paw steps quicker, as a dog's cadence rises with its speed.
    const swingTime = (i: number) => {
      const v = Math.hypot(homeVelocity[i]!.x, homeVelocity[i]!.z)
      return Math.max(0.12, Math.min(gait.swingTime, (stride * 0.8) / Math.max(v, 1e-6)))
    }

    /**
     * Where a paw would land under a body: ahead of its place by as far as its place moves
     * while it is in the air, at most half a stride — it then carries the body as far again.
     */
    const landing = (b: Body, i: number) => {
      const home = placeUnder(b, this.specs[i]!.neutral)
      const v = homeVelocity[i]!
      // In the body's frame: ahead up to half a stride, sideways only as far as a leg reaches.
      const t = swingTime(i)
      const bc = Math.cos(b.heading)
      const bs = Math.sin(b.heading)
      const ahead = clamp((v.x * bs + v.z * bc) * t, stride / 2)
      const across = clamp((v.x * bc - v.z * bs) * t, (stride * aside) / 2)
      return { x: home.x + across * bc + ahead * bs, z: home.z - across * bs + ahead * bc }
    }
    /**
     * How near a planted paw is to the edge of its leg's reach (1 = there): how far it has
     * fallen behind its place, along the way the place moves, and how far off to the side.
     * When the body stands, any distance from its place counts.
     */
    const strain = (i: number) => {
      const f = this.state[i]!
      const home = placeUnder(body, this.specs[i]!.neutral)
      const dx = f.x - home.x
      const dz = f.z - home.z
      const v = homeVelocity[i]!
      const speedHere = Math.hypot(v.x, v.z)
      const [ux, uz] = speedHere > 1e-3 ? [v.x / speedHere, v.z / speedHere] : [s, c]
      const along = dx * ux + dz * uz
      const across = dx * uz - dz * ux
      const behind = speedHere > 1e-3 ? Math.max(0, -along) : Math.abs(along)
      return Math.hypot(behind / (stride / 2), across / (stride * aside))
    }

    // Which paws lift now: the most strained first, as long as enough stay down. With all
    // four down, the first goes at half a stride — setting off, or keeping the trot going as
    // one pair lands and the other takes over.
    const planted = this.state.map((f) => f.swing === null)
    const trigger = still
      ? PAW_SETTLE / stride
      : planted.every(Boolean)
        ? PAW_TRIGGER * 0.25
        : PAW_TRIGGER
    const candidates = this.state
      .map((_, i) => ({ i, strain: planted[i] ? strain(i) : 0 }))
      .filter(({ i, strain: k }) => planted[i] && k >= trigger)
      .sort((a, b) => b.strain - a.strain)
    for (const { i, strain: k } of candidates) {
      if (!planted[i]) continue
      const pair = this.specs[i]!.pair
      const partner = this.specs.findIndex(
        (p, j) => j !== i && pair !== undefined && p.pair === pair,
      )
      const allowed = (count: number) => {
        const down = planted.filter(Boolean).length - count
        return down >= support || (k > PAW_URGENT && down >= support - 1)
      }
      // The pair together if it can; a paw out of reach steps alone if it must.
      const lifting =
        partner >= 0 && planted[partner] && allowed(2) ? [i, partner] : allowed(1) ? [i] : []
      if (lifting.length === 0) continue
      for (const j of lifting) {
        planted[j] = false
        const f = this.state[j]!
        this.swings[j] = { from: { x: f.x, z: f.z, yaw: f.yaw }, time: 0, step: 0 }
      }
    }

    this.state = this.state.map((foot, i) => {
      const swing = this.swings[i]
      if (!swing) {
        // Down: it stays put, turning on its pads at most to keep within reach.
        let yaw = foot.yaw
        const turned = angleTo(body.heading, yaw)
        if (gait.pivot !== undefined && Math.abs(turned) > gait.pivot)
          yaw = body.heading + Math.sign(turned) * gait.pivot
        return { ...foot, yaw, lift: 0, swing: null }
      }
      swing.time += dt
      const duration = swingTime(i)
      const progress = Math.min(1, swing.time / duration)
      // Where it will land: under the body as it will be then, a lead ahead.
      const left = Math.max(0, duration - swing.time)
      const future: Body = {
        x: body.x + vx * left,
        z: body.z + vz * left,
        heading: body.heading + spin * Math.min(left, MAX_TURN_LOOKAHEAD),
      }
      const target = landing(future, i)
      const step = Math.hypot(target.x - swing.from.x, target.z - swing.from.z)
      const k = ease(progress)
      const next: FootState = {
        x: swing.from.x + (target.x - swing.from.x) * k,
        z: swing.from.z + (target.z - swing.from.z) * k,
        yaw: swing.from.yaw + angleTo(swing.from.yaw, future.heading) * k,
        lift: gait.clearance * Math.sin(Math.PI * progress) * Math.min(1, step / 0.15 + 0.2),
        swing: progress,
        stance: 0,
        step,
      }
      if (progress >= 1) {
        this.swings[i] = null
        return { ...next, lift: 0, swing: null }
      }
      return next
    })
    return this.state
  }
}

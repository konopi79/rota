import { angleTo, ease } from './math'

/**
 * Feet that carry the body — the rule the author set: any move of the body is made by the
 * legs, and every move follows on from the last (nothing jumps). A planted foot stays where
 * it is on the ground, whatever the body above it does (it may only turn on the spot, on
 * its heel or pads); when the body has carried it to the edge of where it can stay, the
 * foot lifts and steps to where it will belong by the time it lands. The legs are then
 * solved to reach the feet (`handler.ts`, `dog.ts`).
 *
 * Feet step when they must, not to a clock: the handler alternates left and right, always
 * with one foot down; the dog lifts the paws furthest out of place, never more than two at
 * once, diagonal pairs together when trotting.
 */

/** A body on the field: where it is and which way it faces (heading 0 = +z). */
export type Body = { x: number; z: number; heading: number }

export type FootSpec = {
  name: string
  /** Where the foot stands under a still body, in the body's frame (x left, z ahead). */
  neutral: readonly [number, number]
  /** Paws of one pair lift together (a trot's diagonals). */
  pair?: number
}

export type StepGait = {
  /** Share of the time a foot is on the ground (dog: sets its stride). */
  stance: number
  /** Metres the body moves in one stride cycle (dog). */
  cycleLength: number
  /** How high a full step lifts the foot, metres. */
  clearance: number
  /** How long a step in the air takes, seconds. */
  swingTime: number
  /** Handler: both feet on the ground between steps at least this long, seconds. */
  doubleSupport?: number
  /**
   * Walking on, the feet land this much further back than where they stand still, metres:
   * a person's heel lands just ahead of the hips and pushes off far behind them.
   */
  backShift?: number
  /** Dog: at least this many paws stay down (default two). */
  support?: number
  /** Sideways a leg reaches this share of its reach ahead or back. */
  reachAside?: number
  /** A planted foot turns on the spot to stay within this angle of the body, radians. */
  pivot?: number
}

export type FootState = {
  /** The foot's point on the ground (world), how high it is and which way it points. */
  x: number
  z: number
  lift: number
  yaw: number
  /** Swing progress 0–1, or null while the foot is planted. */
  swing: number | null
  /** How far through its stance a planted foot is, 0 (just landed) – 1 (about to lift). */
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
/**
 * Standing, a foot this close to where it belongs needs no step: a stop is one closing step
 * (the feet parallel, side by side), not shuffling into place.
 */
const SETTLED_DISTANCE = 0.06
const SETTLED_YAW = 0.15
/** A swinging foot expects the body to keep turning this long at most, seconds. */
const MAX_TURN_LOOKAHEAD = 0.5
/** A swinging foot's aim closes on a changed target at this rate, per second. */
const AIM_RATE = 10
/** By default a leg reaches sideways this share of its reach ahead or back. */
const REACH_ASIDE = 0.6

/** `x` kept within ±`limit`. */
const clamp = (x: number, limit: number) => Math.max(-limit, Math.min(limit, x))

type Aim = { x: number; z: number; yaw: number }
type Swing = { from: Aim; aim: Aim | null; time: number; duration: number }

/** One step through the air: from where the foot lifted towards its (eased) aim. */
const swingStep = (swing: Swing, wanted: Aim, dt: number, clearance: number): FootState => {
  const follow = Math.min(1, AIM_RATE * dt)
  const aim: Aim = swing.aim
    ? {
        x: swing.aim.x + (wanted.x - swing.aim.x) * follow,
        z: swing.aim.z + (wanted.z - swing.aim.z) * follow,
        yaw: swing.aim.yaw + angleTo(swing.aim.yaw, wanted.yaw) * follow,
      }
    : wanted
  swing.aim = aim
  const progress = Math.min(1, swing.time / swing.duration)
  const k = ease(progress)
  const step = Math.hypot(aim.x - swing.from.x, aim.z - swing.from.z)
  return {
    x: swing.from.x + (aim.x - swing.from.x) * k,
    z: swing.from.z + (aim.z - swing.from.z) * k,
    yaw: swing.from.yaw + angleTo(swing.from.yaw, aim.yaw) * k,
    // Short steps (closing up, shuffling round) lift less than full ones.
    lift: clearance * Math.sin(Math.PI * progress) * Math.min(1, step / 0.15 + 0.2),
    swing: progress,
    stance: 0,
    step,
  }
}

/** A planted foot turns on the spot (heel, pads) to stay within `pivot` of the body. */
const pivoted = (foot: FootState, heading: number, pivot: number | undefined) => {
  const turned = angleTo(heading, foot.yaw)
  return pivot !== undefined && Math.abs(turned) > pivot
    ? heading + Math.sign(turned) * pivot
    : foot.yaw
}

/** The body's motion between two frames. */
const motionOf = (prev: Body, body: Body, dt: number) => {
  const vx = dt > 0 ? (body.x - prev.x) / dt : 0
  const vz = dt > 0 ? (body.z - prev.z) / dt : 0
  const spin = dt > 0 ? angleTo(prev.heading, body.heading) / dt : 0
  const speed = Math.hypot(vx, vz)
  return { vx, vz, spin, speed, still: speed < STILL_SPEED && Math.abs(spin) < STILL_SPIN }
}

/** Above this the body walks on (m/s): the feet step in rhythm, not only when they must. */
const WALKING = 0.3
/** A planted foot lets the body turn this far past it before it steps round (share of pivot). */
const TURN_TRIGGER = 0.85
/** Setting off with the feet side by side, the foot behind by this much leads (else the right). */
const FIRST_STEP_AFTER = 0.02
/**
 * A person's feet never cross: across the body, a foot stays at least this far to its own
 * side of the other one (heels, metres — a shoe is 11 cm wide), landing and on the way.
 */
const FEET_APART = 0.14
/** Points along a shoe from the heel, metres, and how far apart two shoes keep across. */
const SHOE = [0.02, 0.14, 0.26]
const SHOES_APART = 0.12

/** 1 while `along` is within `near`, fading out over `fade` beyond it. */
const within = (along: number, near: number, fade: number) =>
  Math.max(0, Math.min(1, (near + fade - Math.abs(along)) / fade))

/**
 * How far `foot` must move to its `side` (+1 left, −1 right, across a body facing `heading`)
 * to keep clear of the planted `other`: the heels `FEET_APART` (always, or only while passing),
 * and the shoes — turned as the feet point — side by side. A swinging foot passes the
 * planted one within 20–35 cm along the body.
 */
const shortOfApart = (foot: Aim, other: Aim, heading: number, side: number, passing: boolean) => {
  const c = Math.cos(heading)
  const s = Math.sin(heading)
  const across = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    side * ((a.x - b.x) * c - (a.z - b.z) * s)
  const along = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    (a.x - b.x) * s + (a.z - b.z) * c
  const shoe = (f: Aim) =>
    SHOE.map((d) => ({ x: f.x + d * Math.sin(f.yaw), z: f.z + d * Math.cos(f.yaw) }))
  let short =
    (FEET_APART - across(foot, other)) * (passing ? within(along(foot, other), 0.2, 0.15) : 1)
  for (const p of shoe(foot))
    for (const q of shoe(other))
      short = Math.max(short, (SHOES_APART - across(p, q)) * within(along(p, q), 0.1, 0.08))
  return Math.max(0, short)
}

/** `foot` moved `by` metres across a body facing `heading` (+ = to its left). */
const movedAcross = <T extends { x: number; z: number }>(
  foot: T,
  heading: number,
  by: number,
): T => ({
  ...foot,
  x: foot.x + by * Math.cos(heading),
  z: foot.z - by * Math.sin(heading),
})

/**
 * A person's feet: left, right, left… — never both in the air, a moment on both after each
 * step. The rear foot lifts once the body has carried it half a stride behind its place (or
 * turned past it, or, standing, left it out of place) and the other foot has been down a
 * moment; it lands half a stride ahead, so it then carries the body as far again. Setting
 * off from the feet side by side, the first step is a half step; stopping, the last step
 * lands where the body comes to rest and the other foot closes up.
 */
export class BipedStepper {
  private last: Body
  private state: FootState[]
  private swings: (Swing | null)[]
  /** Seconds each foot has been down. */
  private down: number[]
  private travelled = 0
  private settled = true

  constructor(
    private readonly specs: readonly FootSpec[],
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
    this.down = specs.map(() => 1)
  }

  /** Metres walked over cycle lengths (for what moves along). */
  get cycle() {
    return this.travelled
  }

  get feet(): readonly FootState[] {
    return this.state
  }

  /** Standing still, both feet in place. */
  get still() {
    return this.settled
  }

  /**
   * `rest`: where the body will come to a stand, when it is stopping — the last step lands
   * right there, so a stop is the last step and the other foot closing up beside it.
   */
  update(dt: number, body: Body, gait: StepGait, rest?: Body): FootState[] {
    const prev = this.last
    this.last = { ...body }
    const { vx, vz, spin, speed, still } = motionOf(prev, body, dt)
    this.travelled += (speed * dt) / gait.cycleLength
    const c = Math.cos(body.heading)
    const s = Math.sin(body.heading)
    const forward = vx * s + vz * c
    // Walking on at a good pace, the footfalls move back (`backShift`).
    const back = (gait.backShift ?? 0) * Math.min(1, Math.max(0, forward / 0.6))
    const homeOf = (b: Body, i: number) => {
      const [x, z] = this.specs[i]!.neutral
      return placeUnder(b, [x, z - back])
    }
    const ds = gait.doubleSupport ?? 0.08
    // How far the body carries a planted foot while the other one steps, and so how far
    // ahead a foot lands: half of that.
    const lead = Math.max(0, forward) * (gait.swingTime + 2 * ds) * 0.5
    const reach = Math.max(lead, 0.12)
    const pivot = gait.pivot ?? 0.5

    const offsets = this.state.map((f, i) => {
      const home = homeOf(body, i)
      const dx = f.x - home.x
      const dz = f.z - home.z
      return {
        along: dx * s + dz * c,
        across: dx * c - dz * s,
        turned: Math.abs(angleTo(body.heading, f.yaw)),
        off: Math.hypot(dx, dz),
      }
    })

    const anySwinging = this.swings.some(Boolean)
    if (!anySwinging) {
      // Which foot steps next, if any.
      let next = -1
      let worst = 0
      const level = Math.abs(offsets[0]!.along - offsets[1]!.along) < 0.1
      this.state.forEach((_, i) => {
        const o = offsets[i]!
        const other = this.down[1 - i]!
        if (other < ds) return
        let strain: number
        if (still) {
          strain = o.off > SETTLED_DISTANCE || o.turned > SETTLED_YAW ? 1 + o.off : 0
        } else {
          const behind = Math.max(0, -o.along) / reach
          strain = Math.max(behind, o.turned / (pivot * TURN_TRIGGER), Math.abs(o.across) / 0.12)
          // Walking on, the feet keep their rhythm: the foot behind steps as soon as the one
          // ahead has landed and taken the weight.
          const otherAlong = offsets[1 - i]!.along
          if (forward > WALKING && o.along < otherAlong - 0.05) strain = Math.max(strain, 1)
        }
        if (strain >= 1 && strain > worst) [next, worst] = [i, strain]
      })
      // Setting off from side by side: the foot to lead is the one furthest behind (or the
      // right one if level), as soon as the body moves.
      if (next < 0 && level && !still && forward > 0.05 && this.down.every((d) => d >= ds)) {
        const a = offsets[0]!.along
        const b = offsets[1]!.along
        next = a < b - FIRST_STEP_AFTER ? 0 : 1
      }
      if (next >= 0) {
        const f = this.state[next]!
        const duration = still ? gait.swingTime * 0.8 : gait.swingTime
        this.swings[next] = { from: { x: f.x, z: f.z, yaw: f.yaw }, aim: null, time: 0, duration }
      }
    }
    this.settled =
      still &&
      !this.swings.some(Boolean) &&
      offsets.every((o) => o.off <= SETTLED_DISTANCE && o.turned <= SETTLED_YAW)

    this.state = this.state.map((foot, i) => {
      const swing = this.swings[i]
      if (!swing) {
        this.down[i]! += dt
        const o = offsets[i]!
        const stance =
          still || lead <= 0 ? 0 : Math.min(1, Math.max(0, (lead - o.along) / (2 * lead)))
        return {
          ...foot,
          yaw: pivoted(foot, body.heading, gait.pivot),
          lift: 0,
          swing: null,
          stance,
        }
      }
      swing.time += dt
      const left = Math.max(0, swing.duration - swing.time)
      // Where it will land: under the body as it will be then (or where it comes to rest),
      // half a stride ahead along the way it goes.
      let wanted: Aim
      if (rest) {
        const [x, z] = this.specs[i]!.neutral
        wanted = { ...placeUnder(rest, [x, z]), yaw: rest.heading }
      } else {
        const future: Body = {
          x: body.x + vx * left,
          z: body.z + vz * left,
          heading: body.heading + spin * Math.min(left, MAX_TURN_LOOKAHEAD),
        }
        const home = homeOf(future, i)
        wanted = {
          x: home.x + Math.sin(future.heading) * lead,
          z: home.z + Math.cos(future.heading) * lead,
          yaw: future.heading,
        }
      }
      // It lands to its own side of the other foot, and swings past it on that side.
      const side = Math.sign(this.specs[i]!.neutral[0])
      const other = this.state[1 - i]!
      wanted = movedAcross(
        wanted,
        wanted.yaw,
        side * shortOfApart(wanted, other, wanted.yaw, side, false),
      )
      let next = swingStep(swing, wanted, dt, gait.clearance)
      const inAir = Math.sin(Math.PI * (next.swing ?? 0))
      const clear = shortOfApart(next, other, body.heading, side, true)
      next = movedAcross(next, body.heading, side * clear * inAir)
      if (swing.time >= swing.duration) {
        this.swings[i] = null
        this.down[i] = 0
        return { ...next, lift: 0, swing: null, stance: 0 }
      }
      return next
    })
    return this.state
  }
}

/** A paw steps once it is this near the edge of its reach (1 = there). */
const PAW_TRIGGER = 0.8
/** Standing, a paw this far from where it belongs is put right, metres. */
const PAW_SETTLE = 0.02
/** Past this a paw steps even if that leaves fewer paws down than usual. */
const PAW_URGENT = 0.95

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
  private strained = 0
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

  /**
   * How near the planted paws are to the edge of their reach (1 = there, more = past it, the
   * leg cannot follow): the body must wait for them to step.
   */
  get strain() {
    return this.strained
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
    const { vx, vz, spin, speed, still } = motionOf(prev, body, dt)
    const c = Math.cos(body.heading)
    const s = Math.sin(body.heading)
    const stride = gait.stance * gait.cycleLength
    this.travelled += (speed * dt) / gait.cycleLength
    const sideways = gait.reachAside ?? REACH_ASIDE
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
    const landing = (b: Body, i: number, t: number) => {
      const home = placeUnder(b, this.specs[i]!.neutral)
      const v = homeVelocity[i]!
      // In the body's frame: ahead up to half a stride, sideways only as far as a leg reaches.
      const bc = Math.cos(b.heading)
      const bs = Math.sin(b.heading)
      const ahead = clamp((v.x * bs + v.z * bc) * t, stride / 2)
      const across = clamp((v.x * bc - v.z * bs) * t, (stride * sideways) / 2)
      return { x: home.x + across * bc + ahead * bs, z: home.z - across * bs + ahead * bc }
    }
    /**
     * How near a planted paw is to the edge of its leg's reach (1 = there): how far it has
     * fallen behind its place, along the way the place moves, and how far off to the side.
     */
    const strain = (i: number) => {
      const f = this.state[i]!
      const home = placeUnder(body, this.specs[i]!.neutral)
      const dx = f.x - home.x
      const dz = f.z - home.z
      if (still) return Math.hypot(dx, dz) / PAW_SETTLE
      const v = homeVelocity[i]!
      const speedHere = Math.hypot(v.x, v.z)
      const [ux, uz] = speedHere > 1e-3 ? [v.x / speedHere, v.z / speedHere] : [s, c]
      const along = dx * ux + dz * uz
      const behind = speedHere > 1e-3 ? Math.max(0, -along) : Math.abs(along)
      // A leg's sideways reach is the body's sideways, whichever way the place moves.
      const aside = dx * c - dz * s
      return Math.hypot(behind / (stride / 2), aside / (stride * sideways))
    }

    // Which paws lift now: the most strained first, as long as enough stay down. With all
    // four down, the first goes early — setting off, or keeping the trot going as one pair
    // lands and the other takes over.
    const planted = this.state.map((f) => f.swing === null)
    const trigger = still ? 1 : planted.every(Boolean) ? PAW_TRIGGER * 0.25 : PAW_TRIGGER
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
        // Standing (getting up, settling) nothing is urgent: one paw at a time.
        return down >= support || (!still && k > PAW_URGENT && down >= support - 1)
      }
      // A pair steps together; a paw steps alone only when it must (out of its reach) — so a
      // trot, once the pairs have formed, stays a trot.
      const alone = k > PAW_URGENT && allowed(1)
      const lifting =
        partner < 0
          ? allowed(1)
            ? [i]
            : []
          : planted[partner] && allowed(2)
            ? [i, partner]
            : alone
              ? [i]
              : []
      for (const j of lifting) {
        planted[j] = false
        const f = this.state[j]!
        // How long the step takes is set as it lifts, so it never jumps on the way.
        this.swings[j] = {
          from: { x: f.x, z: f.z, yaw: f.yaw },
          aim: null,
          time: 0,
          duration: swingTime(j),
        }
      }
    }

    // Those still down after this: how strained.
    this.strained = still ? 0 : Math.max(0, ...planted.map((down, i) => (down ? strain(i) : 0)))

    this.state = this.state.map((foot, i) => {
      const swing = this.swings[i]
      if (!swing) {
        // Down: it stays put, turning on its pads at most to keep within reach.
        return { ...foot, yaw: pivoted(foot, body.heading, gait.pivot), lift: 0, swing: null }
      }
      swing.time += dt
      // Where it will land: under the body as it will be then, a lead ahead.
      const left = Math.max(0, swing.duration - swing.time)
      const future: Body = {
        x: body.x + vx * left,
        z: body.z + vz * left,
        heading: body.heading + spin * Math.min(left, MAX_TURN_LOOKAHEAD),
      }
      const next = swingStep(
        swing,
        { ...landing(future, i, swing.duration), yaw: future.heading },
        dt,
        gait.clearance,
      )
      if (swing.time >= swing.duration) {
        this.swings[i] = null
        return { ...next, lift: 0, swing: null }
      }
      return next
    })
    return this.state
  }
}

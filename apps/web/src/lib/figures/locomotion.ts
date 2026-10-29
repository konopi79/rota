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
   * Handler: a run — a foot is down only this long (seconds, less than a step in the air),
   * pushes off before the other one lands, and between steps both are in the air.
   */
  run?: { stanceTime: number }
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
/** A foot turned in more than this (radians) turns out early in its step. */
const TURNED_IN = 0.3
/** A swinging foot's aim closes on a changed target at this rate, per second. */
const AIM_RATE = 10
/** By default a leg reaches sideways this share of its reach ahead or back. */
const REACH_ASIDE = 0.6

/** `x` kept within ±`limit`. */
const clamp = (x: number, limit: number) => Math.max(-limit, Math.min(limit, x))

type Aim = { x: number; z: number; yaw: number }

/** How far a point on the ground is from what the feet keep clear of (≤ 0 on it), metres. */
export type Clearance = (p: { x: number; z: number }) => number
/** A step set by hand: this foot (0 left, 1 right) to there, pointing that way. */
export type FootTarget = { foot: number; x: number; z: number; yaw: number }

/** A step set by hand takes this long in the air, seconds — a deliberate step. */
const SCRIPTED_STEP = 0.55

type Swing = {
  /** A step set by hand lands exactly here. */
  fixed?: Aim
  from: Aim
  aim: Aim | null
  time: number
  duration: number
  /** How high and how (a runner's heel kick) the step lifts the foot — set as it lifts. */
  clearance?: number
  /** Taken over in the air (from the gallop): how high it was then, coming down from there. */
  fromLift?: number
  kick?: boolean
  /** How far it lands and swings off its way to keep clear of the dog (eased, never jumping). */
  dodgeLanding?: { x: number; z: number }
  dodgeInAir?: { x: number; z: number }
}

/** A step aside lifts the foot this share of a usual step. */
const ASIDE_LIFT = 0.4

/** Whether a step from `from` to `to` goes mostly sideways across a body facing as `body`. */
const aside = (from: { x: number; z: number }, to: { x: number; z: number }, body: Body) => {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const across = Math.abs(dx * Math.cos(body.heading) - dz * Math.sin(body.heading))
  const along = Math.abs(dx * Math.sin(body.heading) + dz * Math.cos(body.heading))
  return across > 2 * along
}

/** A dodge moves at most this fast, m/s — a foot's own pace, so it never jumps. */
const DODGE_RATE = 1.5

/** `from` moved towards `to` by at most `step` metres. */
const towards = (from: { x: number; z: number }, to: { x: number; z: number }, step: number) => {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const d = Math.hypot(dx, dz)
  return d <= step ? { ...to } : { x: from.x + (dx / d) * step, z: from.z + (dz / d) * step }
}

/** One step through the air: from where the foot lifted towards its (eased) aim. */
const swingStep = (
  swing: Swing,
  wanted: Aim,
  dt: number,
  clearance: number,
  kick = false,
  side = 0,
): FootState => {
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
  const turn = angleTo(swing.from.yaw, aim.yaw)
  const turnsOut = side !== 0 && Math.sign(turn) === side && Math.abs(turn) > TURNED_IN
  const step = Math.hypot(aim.x - swing.from.x, aim.z - swing.from.z)
  return {
    x: swing.from.x + (aim.x - swing.from.x) * k,
    z: swing.from.z + (aim.z - swing.from.z) * k,
    // A foot that was turned in towards the other one turns out early in the step, so its
    // knee does not swing across the other leg; otherwise it turns along with the step.
    yaw: swing.from.yaw + turn * (turnsOut ? ease(Math.min(1, 2 * progress)) : k),
    // Short steps (closing up, shuffling round) lift less than full ones.
    // A runner kicks the heel up behind: the foot is highest before halfway through.
    lift:
      (swing.clearance ?? clearance) *
        Math.sin(
          Math.PI *
            ((swing.kick ?? kick)
              ? progress + (0.4 * Math.sin(Math.PI * progress)) / Math.PI
              : progress),
        ) *
        Math.min(1, step / 0.15 + 0.2) +
      (swing.fromLift ?? 0) * (1 - k),
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
/** Above this a runner runs (m/s); below it, setting off or stopping, it walks. */
const RUNNING = 1.3
/** Running, a foot pushes off once the other one is this far through its step. */
const RUN_PUSH_OFF = 0.5
/** A planted foot this far out to the side of its place steps back under the body, metres. */
const ACROSS_TRIGGER = 0.08
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
/** Half a shoe's width, metres. */
const SHOE_HALF_WIDTH = 0.055
/** How far a shoe keeps from the dog, metres; nearer, a planted foot steps away. */
const KEEP_CLEAR = 0.06

/** How far `foot`'s shoe is from what it keeps clear of. */
const shoeClear = (foot: Aim, clear: Clearance) =>
  Math.min(
    ...SHOE.map((d) =>
      clear({ x: foot.x + d * Math.sin(foot.yaw), z: foot.z + d * Math.cos(foot.yaw) }),
    ),
  ) - SHOE_HALF_WIDTH

/**
 * The smallest shift (across and along a body facing `heading`) that takes `foot` clear of
 * `clear` without bringing it closer to the `other` foot than the feet keep apart; none if
 * it is clear already (or no shift does it).
 */
const clearShift = (foot: Aim, other: Aim, heading: number, side: number, clear: Clearance) => {
  if (shoeClear(foot, clear) >= KEEP_CLEAR) return { x: 0, z: 0 }
  const c = Math.cos(heading)
  const s = Math.sin(heading)
  let best = { x: 0, z: 0 }
  let bestCost = Infinity
  for (let a = -10; a <= 10; a++)
    for (let b = -10; b <= 10; b++) {
      const across = a * 0.02
      const along = b * 0.02
      const cost = Math.hypot(across, along)
      if (cost >= bestCost) continue
      const shift = { x: across * c + along * s, z: -across * s + along * c }
      const moved = { ...foot, x: foot.x + shift.x, z: foot.z + shift.z }
      if (shoeClear(moved, clear) < KEEP_CLEAR) continue
      if (shortOfApart(moved, other, heading, side, false) > 0) continue
      best = shift
      bestCost = cost
    }
  return best
}
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
  /** The foot that stepped last. */
  private lastStep = -1

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
  /**
   * `script`: a step set by hand — that foot steps exactly there once both feet have been
   * down a moment; the stepper takes no steps of its own meanwhile.
   */
  /** `avoid`: what the feet keep clear of — the dog. */
  update(
    dt: number,
    body: Body,
    gait: StepGait,
    rest?: Body,
    script?: FootTarget,
    avoid?: Clearance,
  ): FootState[] {
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
    // Running only once the body moves at a run; setting off and stopping, it walks.
    const running = gait.run !== undefined && forward > RUNNING
    const ds = running ? 0 : (gait.doubleSupport ?? 0.08)
    // How far the body carries a planted foot while it is down — walking, while the other
    // one steps — and so how far ahead a foot lands: half of that.
    const stanceTime = running ? gait.run!.stanceTime : gait.swingTime + 2 * ds
    const lead = Math.max(0, forward) * stanceTime * 0.5
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

    // Walking, a foot lifts only with the other one down; running, it pushes off once the
    // other one is on its way down — a moment in the air between steps.
    const canStep = this.swings.every(
      (swing) => !swing || (running && swing.time >= RUN_PUSH_OFF * swing.duration),
    )
    if (script) {
      const f = this.state[script.foot]!
      const there =
        Math.hypot(f.x - script.x, f.z - script.z) < 0.01 &&
        Math.abs(angleTo(f.yaw, script.yaw)) < 0.02
      if (!this.swings.some(Boolean) && !there && this.down.every((d) => d >= ds)) {
        this.lastStep = script.foot
        this.swings[script.foot] = {
          fixed: { x: script.x, z: script.z, yaw: script.yaw },
          from: { x: f.x, z: f.z, yaw: f.yaw },
          aim: null,
          time: 0,
          duration: SCRIPTED_STEP,
          // A step aside goes low over the ground, the knee hardly forward.
          clearance: gait.clearance * (aside(f, script, body) ? ASIDE_LIFT : 1),
          kick: false,
        }
      }
    } else if (canStep) {
      // Which foot steps next, if any.
      let next = -1
      let worst = 0
      const level = Math.abs(offsets[0]!.along - offsets[1]!.along) < 0.1
      // Both feet down a moment (the one just landed takes the weight) before either lifts.
      const ready = running || this.down.every((d) => d >= ds)
      const strains = this.state.map((_, i) => {
        const o = offsets[i]!
        if (this.swings[i]) return 0
        let strain: number
        if (still) {
          strain = o.off > SETTLED_DISTANCE || o.turned > SETTLED_YAW ? 1 + o.off : 0
        } else {
          const behind = Math.max(0, -o.along) / reach
          strain = Math.max(
            behind,
            o.turned / (pivot * TURN_TRIGGER),
            Math.abs(o.across) / ACROSS_TRIGGER,
          )
          // Walking on, the feet keep their rhythm: the foot behind steps as soon as the one
          // ahead has landed and taken the weight.
          const otherAlong = offsets[1 - i]!.along
          if (!running && forward > WALKING && o.along < otherAlong - 0.05)
            strain = Math.max(strain, 1)
          // A planted foot the dog comes too near (turning towards it) steps away.
          if (avoid) {
            const k = shoeClear(this.state[i]!, avoid)
            if (k < KEEP_CLEAR) strain = Math.max(strain, 1 + KEEP_CLEAR - k)
          }
        }
        return strain
      })
      strains.forEach((strain, i) => {
        if (ready && strain >= 1 && strain > worst) [next, worst] = [i, strain]
      })
      // Moving, the feet take turns: the foot that stepped last goes again only if the other
      // one need not (turning sharply, the inner foot would otherwise step on and on).
      const other = 1 - this.lastStep
      if (!still && next === this.lastStep && strains[other]! >= 1) next = other
      // Setting off from side by side: the foot to lead is the one furthest behind (or the
      // right one if level), as soon as the body moves.
      const bothDown = !this.swings.some(Boolean)
      if (
        next < 0 &&
        bothDown &&
        level &&
        !still &&
        forward > 0.05 &&
        this.down.every((d) => d >= ds)
      ) {
        const a = offsets[0]!.along
        const b = offsets[1]!.along
        next = a < b - FIRST_STEP_AFTER ? 0 : 1
      }
      if (next >= 0) {
        this.lastStep = next
        const f = this.state[next]!
        const duration = still ? gait.swingTime * 0.8 : gait.swingTime
        this.swings[next] = {
          from: { x: f.x, z: f.z, yaw: f.yaw },
          aim: null,
          time: 0,
          duration,
          clearance: gait.clearance,
          kick: running,
        }
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
          // Planted, it turns on the spot to stay with the body (not in steps set by hand).
          yaw: script ? foot.yaw : pivoted(foot, body.heading, gait.pivot),
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
      if (swing.fixed) {
        wanted = swing.fixed
      } else if (rest) {
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
      if (!swing.fixed)
        wanted = movedAcross(
          wanted,
          wanted.yaw,
          side * shortOfApart(wanted, other, wanted.yaw, side, false),
        )
      // …and clear of the dog, landing and on the way.
      if (avoid && !swing.fixed) {
        const shift = clearShift(wanted, other, wanted.yaw, side, avoid)
        swing.dodgeLanding = towards(swing.dodgeLanding ?? shift, shift, DODGE_RATE * dt)
        wanted = {
          ...wanted,
          x: wanted.x + swing.dodgeLanding.x,
          z: wanted.z + swing.dodgeLanding.z,
        }
      }
      let next = swingStep(swing, wanted, dt, gait.clearance, running, side)
      const inAir = Math.sin(Math.PI * (next.swing ?? 0))
      const clear = shortOfApart(next, other, body.heading, side, true)
      next = movedAcross(next, body.heading, side * clear * inAir)
      if (avoid && !swing.fixed) {
        const shift = clearShift(next, other, body.heading, side, avoid)
        swing.dodgeInAir = towards(swing.dodgeInAir ?? { x: 0, z: 0 }, shift, DODGE_RATE * dt)
        next = {
          ...next,
          x: next.x + swing.dodgeInAir.x * inAir,
          z: next.z + swing.dodgeInAir.z * inAir,
        }
      }
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

/** Spinning, a paw's step takes no longer than this many radians of the turn. */
const SPIN_STEP = 0.45
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

  /**
   * Go on from where another gait (the gallop) left the paws: those down stay where they
   * are, those in the air come down from where they are, as quick steps.
   */
  takeOver(feet: readonly FootState[], body: Body) {
    this.state = feet.map((f) => ({ ...f, lift: f.swing === null ? 0 : f.lift }))
    this.swings = feet.map((f) =>
      f.swing === null
        ? null
        : {
            from: { x: f.x, z: f.z, yaw: f.yaw },
            aim: null,
            time: 0,
            duration: 0.15,
            fromLift: f.lift,
          },
    )
    this.last = { ...body }
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

  /** `rest`: where the body will come to a stand, when it is stopping. */
  update(dt: number, body: Body, gait: StepGait, rest?: Body): FootState[] {
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
    // …and turning fast on the spot, in quick short steps, as a dog spins.
    const swingTime = (i: number) => {
      const v = Math.hypot(homeVelocity[i]!.x, homeVelocity[i]!.z)
      const turning = SPIN_STEP / Math.max(Math.abs(spin), 1e-6)
      return Math.max(0.12, Math.min(gait.swingTime, (stride * 0.8) / Math.max(v, 1e-6), turning))
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
      // Where it will land: under the body as it will be then, a lead ahead — when the body
      // is coming to a stand, no further than where it stops, so the dog stops on its paws
      // rather than behind them (and steps back to them).
      const left = Math.max(0, swing.duration - swing.time)
      let future: Body = {
        x: body.x + vx * left,
        z: body.z + vz * left,
        heading: body.heading + spin * Math.min(left, MAX_TURN_LOOKAHEAD),
      }
      let lead = swing.duration
      if (rest && speed > 1e-3) {
        const toRest = ((rest.x - body.x) * vx + (rest.z - body.z) * vz) / speed
        const going = speed * left
        if (going >= toRest) {
          future = { ...rest }
          lead = 0
        } else lead = Math.min(lead, (toRest - going) / speed)
      }
      const next = swingStep(
        swing,
        { ...landing(future, i, lead), yaw: future.heading },
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

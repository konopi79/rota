import { DOG, DOG_FEET, DOG_POSTURES, DOG_STANDING_HEIGHT, dogLegs } from './dog'
import type { Body, FootState } from './locomotion'
import { lowestPoint, type Pose } from './rig'

/**
 * A jump over a bar (plan R17: 2-217, 2-218, 3-313, 3-314). The bar jump of the regulation
 * (p. 10): 1–1.5 m wide, the bar laid loose on two uprights, no wings; for a dog of 50 cm or
 * more at the withers, as ours, 40 cm high.
 *
 * The leap is driven by where the dog's body is along the way over the bar, not by time —
 * however fast it comes. Before the bar the hind paws come together under the hips and push
 * off, the forelegs folded under the chest; the body flies over in an arc, the loin rounding
 * as the hips pass over the bar; the forefeet land one after the other, then the hind feet,
 * and the dog trots or gallops on. A paw on the ground stays where it is (the author's rule).
 */

/** The bar's height (top), metres, and the jump's width; the uprights. */
export const BAR_HEIGHT = 0.4
export const JUMP_WIDTH = 1.2
export const UPRIGHT_HEIGHT = 0.9

/** A jump on the field: its bar's middle and the way over it (heading, as the team's). */
export type Bar = { x: number; z: number; heading: number }

/** How far along the way over `bar` a body's middle is (metres, negative before the bar). */
export const alongBar = (bar: Bar, body: { x: number; z: number }) =>
  (body.x - bar.x) * Math.sin(bar.heading) + (body.z - bar.z) * Math.cos(bar.heading)

/** How far off the bar's middle a body is along the bar (metres, left positive). */
export const acrossBar = (bar: Bar, body: { x: number; z: number }) =>
  (body.x - bar.x) * Math.cos(bar.heading) - (body.z - bar.z) * Math.sin(bar.heading)

/**
 * Where along the way over the bar (the body's middle, metres from the bar, negative before
 * it) each part of the leap happens.
 */
export const LEAP_FROM = -0.9
export const LEAP_UNTIL = 1.05
const HINDS_SET = -0.72
const PUSH = -0.55
const FORES_LAND = [0.55, 0.6]
const FORES_LIFT = [0.76, 0.82]
const HINDS_LAND = [0.85, 0.9]

/** The hind paws set down this far ahead of the hips, before the push. */
const HIND_SET_AHEAD = 0.05

/** From the body's middle to the shoulders and the hips along it, metres. */
const SHOULDERS = 0.22
const HIPS = -0.23
const PAW_X = DOG_FEET.trot.map((s) => s.neutral[0])

type Key = { a: number; v: number }
/** A smooth curve through keys (Catmull–Rom), held at its ends. */
const curve =
  (keys: Key[]) =>
  (a: number): number => {
    if (a <= keys[0]!.a) return keys[0]!.v
    if (a >= keys.at(-1)!.a) return keys.at(-1)!.v
    let i = 0
    while (keys[i + 1]!.a < a) i++
    const [p, q] = [keys[i]!, keys[i + 1]!]
    const before = keys[i - 1] ?? p
    const after = keys[i + 2] ?? q
    const span = q.a - p.a
    const t = (a - p.a) / span
    const m0 = ((q.v - before.v) / (q.a - before.a || 1)) * span
    const m1 = ((after.v - p.v) / (after.a - p.a || 1)) * span
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * p.v +
      (t3 - 2 * t2 + t) * m0 +
      (-2 * t3 + 3 * t2) * q.v +
      (t3 - t2) * m1
    )
  }

/** The body's middle: crouching to push off, an arc over the bar, giving on landing. */
const HEIGHT = curve([
  { a: LEAP_FROM, v: DOG_STANDING_HEIGHT },
  { a: PUSH, v: 0.37 },
  { a: -0.3, v: 0.7 },
  { a: 0, v: 0.8 },
  { a: 0.3, v: 0.7 },
  { a: 0.55, v: 0.4 },
  { a: 0.72, v: 0.35 },
  { a: LEAP_UNTIL, v: DOG_STANDING_HEIGHT },
])
/** Nose up pushing off, level over the bar, down onto the forefeet. */
const PITCH = curve([
  { a: LEAP_FROM, v: 0 },
  { a: PUSH, v: -0.3 },
  { a: 0, v: 0 },
  { a: 0.55, v: 0.28 },
  { a: 0.88, v: 0.05 },
  { a: LEAP_UNTIL, v: 0 },
])
/** The loin stretched in the push, rounded as the hips pass over the bar. */
const FLEX = curve([
  { a: LEAP_FROM, v: 0 },
  { a: PUSH, v: 0.12 },
  { a: 0.25, v: -0.35 },
  { a: 0.7, v: 0 },
  { a: LEAP_UNTIL, v: 0 },
])

/**
 * The paws in the air, relative to their leg's root along the way (`ahead`, metres) and how
 * high off the ground (`up`): forelegs folded high under the chest over the bar and reaching
 * down to land; hind legs trailing after the push, then folded high as the hips go over.
 */
const FORE_AHEAD = curve([
  { a: LEAP_FROM, v: -0.05 },
  { a: PUSH, v: 0.05 },
  { a: -0.2, v: 0.05 },
  { a: 0.2, v: 0.12 },
  { a: 0.55, v: 0.13 },
])
const FORE_UP = curve([
  { a: LEAP_FROM, v: 0 },
  { a: HINDS_SET, v: 0.12 },
  { a: PUSH, v: 0.25 },
  { a: -0.3, v: 0.52 },
  { a: 0, v: 0.55 },
  { a: 0.25, v: 0.4 },
  { a: 0.55, v: 0 },
])
const HIND_AHEAD = curve([
  { a: HINDS_SET, v: HIND_SET_AHEAD },
  { a: PUSH, v: HIND_SET_AHEAD + HINDS_SET - PUSH },
  { a: -0.25, v: -0.32 },
  { a: 0.3, v: -0.04 },
  { a: 0.7, v: 0.1 },
  { a: 0.88, v: 0.1 },
])
const HIND_UP = curve([
  // Stepping together under the hips first, low.
  { a: LEAP_FROM, v: 0 },
  { a: (LEAP_FROM + HINDS_SET) / 2, v: 0.07 },
  { a: HINDS_SET, v: 0 },
  { a: PUSH, v: 0 },
  { a: -0.25, v: 0.22 },
  { a: 0.27, v: 0.55 },
  { a: 0.6, v: 0.22 },
  { a: 0.88, v: 0 },
])
/** After the forefeet's landing they lift for the next stride, as the trot or gallop takes over. */
const FORE_AGAIN_AHEAD = curve([
  { a: 0.76, v: -0.13 },
  { a: LEAP_UNTIL, v: 0.05 },
])
const FORE_AGAIN_UP = curve([
  { a: 0.76, v: 0 },
  { a: LEAP_UNTIL, v: 0.08 },
])

/** Over this far (metres of the way) a paw comes from where it was onto its curve. */
const ONTO_CURVE = 0.15

export class Leap {
  private readonly c: number
  private readonly s: number
  /** Each paw's place on the ground while down (null in the air). */
  private down: ({ x: number; z: number } | null)[]
  /** How far each paw was off its curve as it came onto it, and from where along the way. */
  private offsets: ({ x: number; z: number; up: number; from: number } | null)[]
  feet: FootState[]
  pose: Pose = {}
  private last = LEAP_FROM

  constructor(
    private readonly bar: Bar,
    body: Body,
    feet: readonly FootState[],
  ) {
    this.c = Math.cos(bar.heading)
    this.s = Math.sin(bar.heading)
    this.feet = feet.map((f) => ({ ...f }))
    // The hind paws step together under the hips, where they push off from; the forepaws lift.
    this.down = [null, null, null, null]
    const a = this.along(body)
    this.last = a
    const curve = this.curveFeet(body, a)
    this.offsets = feet.map((f, i) => ({
      x: f.x - curve[i]!.x,
      z: f.z - curve[i]!.z,
      up: f.lift - curve[i]!.lift,
      from: a,
    }))
  }

  /** How far along the way over the bar the body's middle is (metres, negative before it). */
  along(body: { x: number; z: number }) {
    return (body.x - this.bar.x) * this.s + (body.z - this.bar.z) * this.c
  }

  /** The leap is over once the body is this far past the bar. */
  get over() {
    return this.last >= LEAP_UNTIL
  }

  /** A place `ahead` along the way from the bar and `aside` (left) of the bar's middle line. */
  private at(ahead: number, aside: number) {
    return {
      x: this.bar.x + this.c * aside + this.s * ahead,
      z: this.bar.z - this.s * aside + this.c * ahead,
    }
  }

  /** Where each paw is in the air at `a`, on its curve, for a body at `body`. */
  private curveFeet(body: Body, a: number): FootState[] {
    // The body's line sideways off the bar's middle (it goes straight over it, more or less).
    const side = (body.x - this.bar.x) * this.c - (body.z - this.bar.z) * this.s
    return [0, 1, 2, 3].map((i) => {
      const fore = i < 2
      const again = fore && a >= FORES_LIFT[i]!
      const ahead = fore
        ? (again ? FORE_AGAIN_AHEAD(a) : FORE_AHEAD(a)) + SHOULDERS
        : HIND_AHEAD(a) + HIPS
      const up = fore ? (again ? FORE_AGAIN_UP(a) : FORE_UP(a)) : HIND_UP(a)
      const p = this.at(a + ahead, side + PAW_X[i]!)
      return { ...p, yaw: this.bar.heading, lift: up, swing: 0.5, stance: 0, step: 0 }
    })
  }

  /** On by the way the body has come (`body`): the legs, and how the trunk is carried. */
  update(body: Body): { pose: Pose; lift: number; feet: FootState[] } {
    const a = this.along(body)
    const before = this.last
    this.last = a
    const crossed = (at: number) => before < at && at <= a
    const curve = this.curveFeet(body, a)
    this.feet = curve.map((here, i) => {
      const fore = i < 2
      // Down and up: the hind paws set under the hips and push off; the forepaws land and lift.
      if (!fore && crossed(HINDS_SET)) this.down[i] = this.drawn(i, here, a)
      if (!fore && crossed(PUSH)) this.lift(i, here, a)
      if (fore && crossed(FORES_LAND[i]!)) this.down[i] = this.drawn(i, here, a)
      if (fore && crossed(FORES_LIFT[i]!)) this.lift(i, here, a)
      if (!fore && crossed(HINDS_LAND[i - 2]!)) this.down[i] = this.drawn(i, here, a)
      const down = this.down[i]
      if (down)
        return {
          x: down.x,
          z: down.z,
          yaw: this.bar.heading,
          lift: 0,
          swing: null,
          stance: 0,
          step: 0,
        }
      return this.drawn(i, here, a)
    })
    const carriage = { height: HEIGHT(a), pitch: PITCH(a), flex: FLEX(a) }
    const legs = dogLegs(this.feet, body, carriage)
    const pose: Pose = {
      ...DOG_POSTURES.stand,
      ...legs,
      trunk: carriage.pitch,
      loin: carriage.flex,
      // Head up and forward over the bar, the tail streaming out behind.
      head: (DOG_POSTURES.stand.head ?? 0) - 0.2,
      tail: -0.25,
    }
    this.pose = pose
    return { pose, lift: Math.max(0, carriage.height + lowestPoint(DOG, pose)), feet: this.feet }
  }

  /** A paw leaving the ground: from where it stood it comes onto its curve. */
  private lift(i: number, here: FootState, a: number) {
    const stood = this.down[i]
    this.down[i] = null
    if (stood)
      this.offsets[i] = { x: stood.x - here.x, z: stood.z - here.z, up: -here.lift, from: a }
  }

  /** Where a paw in the air is drawn: on its curve, coming onto it from where it was. */
  private drawn(i: number, here: FootState, a: number): FootState {
    const off = this.offsets[i]
    if (!off) return here
    const k = Math.min(1, Math.max(0, (a - off.from) / ONTO_CURVE))
    const fade = 1 - k * k * (3 - 2 * k)
    if (fade === 0) this.offsets[i] = null
    return {
      ...here,
      x: here.x + off.x * fade,
      z: here.z + off.z * fade,
      lift: Math.max(0, here.lift + off.up * fade),
    }
  }
}

import { DOG, DOG_FEET, DOG_POSTURES, DOG_STANDING_HEIGHT, dogLegs, type Carriage } from './dog'
import type { Body, FootState } from './locomotion'
import { lowestPoint, type Pose } from './rig'

/**
 * The gallop (plan R17: a dog called runs in), after a drawn study of a dog's gaits that the
 * author picked — a stride of twelve frames: the forelegs land one after the other and
 * push off; the dog flies gathered, its back arched, all four legs folded under it; the hind
 * legs land far forward under the belly one after the other and drive; it flies stretched
 * out, forelegs reaching ahead and hind legs back; and lands on the forelegs again.
 *
 * A stride is driven by the distance the dog goes, not by time: a paw on the ground stays
 * exactly where it landed while the body goes on over it (the author's rule — the legs carry
 * every move). The study shows the gallop at full speed; setting off and slowing down a dog
 * takes shorter strides (the author), so the stride, the legs' reach and the bend of the back
 * grow with the speed (`reach`). In the air each paw follows a curve set relative to its leg
 * (`SWING`).
 */

/** Metres a stride at full speed (`FULL_SPEED`, m/s) and at the slowest gallop (`SLOW_SPEED`). */
export const GALLOP_STRIDE = 1.3
const SHORTEST_STRIDE = 0.8
const FULL_SPEED = 3.2
const SLOW_SPEED = 2
/** How quickly the stride follows the dog's speed, 1/s. */
const STRIDE_FOLLOWS = 8

/**
 * When in the stride each paw lands and lifts (0–1, a stride from the first forefoot down),
 * in `DOG_FEET` order — left fore, right fore, left hind, right hind: the rotary gallop of
 * dogs, the paws striking left fore, right fore, right hind, left hind.
 */
const STRIDE: { lands: number; lifts: number }[] = [
  { lands: 0, lifts: 0.2 },
  { lands: 0.07, lifts: 0.27 },
  { lands: 0.52, lifts: 0.72 },
  { lands: 0.45, lifts: 0.65 },
]

/** The stride's two flights: gathered (back arched) and stretched out, at these points. */
const GATHERED = 0.37
const STRETCHED = 0.87

/**
 * A paw in the air, relative to its leg: how far ahead of the leg's root (metres) and how
 * high off the ground, at points `u` (0–1) of its time in the air — a smooth curve through
 * them. It lifts where the stride's time down leaves it (`± GROUND / 2`) and lands as far
 * ahead.
 */
const GROUND = GALLOP_STRIDE * 0.2
type Key = { u: number; ahead: number; up: number }
const swingKeys = (
  lifts: number,
  lands: number,
  keys: { at: number; ahead: number; up: number }[],
) => {
  const span = (lands - lifts + 1) % 1 || 1
  return [
    { u: 0, ahead: -GROUND / 2, up: 0 },
    ...keys.map((k) => ({ u: ((k.at - lifts + 1) % 1) / span, ahead: k.ahead, up: k.up })),
    { u: 1, ahead: GROUND / 2, up: 0 },
  ].sort((a, b) => a.u - b.u)
}
/** Forelegs: folded back under the chest in the gathered flight, reaching far ahead stretched. */
const FORE = (i: number) =>
  swingKeys(STRIDE[i]!.lifts, STRIDE[i]!.lands, [
    { at: GATHERED, ahead: -0.2, up: 0.24 },
    { at: STRETCHED, ahead: 0.42, up: 0.16 },
  ])
/** Hind legs: stretched back in the stretched flight, swung far forward under the belly gathered. */
const HIND = (i: number) =>
  swingKeys(STRIDE[i]!.lifts, STRIDE[i]!.lands, [
    { at: STRETCHED, ahead: -0.42, up: 0.2 },
    { at: GATHERED - 0.04, ahead: 0.38, up: 0.18 },
  ])
const SWING: Key[][] = [FORE(0), FORE(1), HIND(2), HIND(3)]

/** A smooth curve through the keys (Catmull–Rom), at `u`. */
const along = (keys: Key[], u: number) => {
  let i = 0
  while (i < keys.length - 2 && keys[i + 1]!.u < u) i++
  const [a, b] = [keys[i]!, keys[i + 1]!]
  const before = keys[i - 1] ?? a
  const after = keys[i + 2] ?? b
  const t = Math.min(1, Math.max(0, (u - a.u) / (b.u - a.u || 1)))
  const hermite = (p0: number, p1: number, m0: number, m1: number) => {
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1
    )
  }
  const slope = (p: Key, q: Key, k: 'ahead' | 'up') =>
    ((q[k] - p[k]) / (q.u - p.u || 1)) * (b.u - a.u)
  return {
    ahead: hermite(a.ahead, b.ahead, slope(before, b, 'ahead') / 2, slope(a, after, 'ahead') / 2),
    up: Math.max(0, hermite(a.up, b.up, slope(before, b, 'up') / 2, slope(a, after, 'up') / 2)),
  }
}

/** Periodic over the stride: 1 at `at`, −1 half a stride away. */
const wave = (phase: number, at: number, times = 1) => Math.cos(2 * Math.PI * times * (phase - at))

/**
 * How the trunk is carried through the stride: lower than standing (longer reach), highest
 * in each flight; nose a little down on the forelegs, up on the hind legs; the loin arched
 * (hind quarters tucked under) in the gathered flight, straightened in the stretched one.
 */
const carriage = (phase: number, reach: number): Carriage => {
  // How far from the shortest stride to the full one (0–1).
  const full = (reach - SHORTEST_STRIDE / GALLOP_STRIDE) / (1 - SHORTEST_STRIDE / GALLOP_STRIDE)
  return {
    height: 0.375 - 0.02 * full + 0.02 * reach * wave(phase, GATHERED, 2),
    pitch: 0.06 * reach * wave(phase, 0.12),
    flex: (-0.15 - 0.3 * wave(phase, GATHERED)) * reach,
  }
}

/** Where each leg hangs from, ahead of the trunk's middle (shoulders, hips), metres. */
const ROOT_AHEAD = [0.22, 0.22, -0.22, -0.22]
const PAW_X = DOG_FEET.gallop.map((s) => s.neutral[0])

/**
 * Entering the gallop the trunk goes from how a trotting dog carries it to the stride's over
 * about this long, s.
 */
const BLEND = 0.12
/**
 * Entering, the stride starts at the stretched-out flight, every paw in the air: each comes
 * from where the trot left it onto its curve by the time it lands. A paw lifting comes off
 * where it stood onto its curve over this share of a stride.
 */
const ENTRY = 0.75
const LIFT_ONTO_CURVE = 0.2

const frac = (x: number) => ((x % 1) + 1) % 1
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** How a dog at the trot carries its trunk and head (`team.ts`), blended from on entering. */
const TROT_CARRIAGE: Carriage = { height: DOG_STANDING_HEIGHT, pitch: 0, flex: 0 }
const TROT_HEAD = {
  neck: DOG_POSTURES.stand.neck ?? 0,
  head: (DOG_POSTURES.stand.head ?? 0) - 0.15,
}

export class Gallop {
  /** Where in the stride the dog is (0–1). */
  private phase: number
  private last: Body
  /** Each paw down: where it stands. */
  private down: ({ x: number; z: number; yaw: number } | null)[] = [null, null, null, null]
  /**
   * How far each paw was off its curve as it came onto it (entering, lifting), fading out
   * between those points of the dog's way (`strides`).
   */
  private offsets: { x: number; z: number; up: number; from: number; until: number }[]
  private time = 0
  /** Strides gone since the gallop began. */
  private strides = 0
  /** The dog's speed, eased (m/s), and the stride's length as a share of the full one. */
  private speed = SLOW_SPEED
  private reach = SHORTEST_STRIDE / GALLOP_STRIDE
  feet: FootState[]
  /** The pose of the last frame (to blend out of the gallop from). */
  pose: Pose = {}

  /** Taking over from the trot (`feet` where the trot left the paws), at `ENTRY`. */
  constructor(body: Body, feet: readonly FootState[]) {
    this.phase = ENTRY
    this.last = { ...body }
    this.feet = feet.map((f) => ({ ...f }))
    const curve = this.curveFeet(body)
    this.offsets = feet.map((f, i) => ({
      x: f.x - curve[i]!.x,
      z: f.z - curve[i]!.z,
      up: f.lift - curve[i]!.lift,
      from: 0,
      until: frac(STRIDE[i]!.lands - ENTRY) || 1,
    }))
  }

  /** Where each paw is in the air at this point of the stride, for a body at `body` (no blending). */
  private curveFeet(body: Body): FootState[] {
    const c = Math.cos(body.heading)
    const s = Math.sin(body.heading)
    const carried = this.carried()
    return STRIDE.map(({ lands, lifts }, i) => {
      const u = frac(this.phase - lifts) / frac(lands - lifts)
      const key = along(SWING[i]!, Math.min(1, u))
      // A shorter stride: the paws reach as much less far, and lift a little less high.
      const ahead = key.ahead * this.reach
      const up = key.up * (0.6 + 0.4 * this.reach)
      // The leg's root, ahead of the middle as the trunk is pitched (and for the hind legs
      // as the loin bends).
      const root = ROOT_AHEAD[i]! * Math.cos(carried.pitch + (i >= 2 ? carried.flex : 0))
      const forward = root + ahead
      return {
        x: body.x + c * PAW_X[i]! + s * forward,
        z: body.z - s * PAW_X[i]! + c * forward,
        yaw: body.heading,
        lift: up,
        swing: u,
        stance: 0,
        step: 0,
      }
    })
  }

  /** On by the way the body has come (`body`), its pose: the legs and how the trunk is carried. */
  update(dt: number, body: Body): { pose: Pose; lift: number; feet: FootState[] } {
    const moved = Math.hypot(body.x - this.last.x, body.z - this.last.z)
    this.last = { ...body }
    if (dt > 0) this.speed += (moved / dt - this.speed) * (1 - Math.exp(-STRIDE_FOLLOWS * dt))
    const share = Math.min(1, Math.max(0, (this.speed - SLOW_SPEED) / (FULL_SPEED - SLOW_SPEED)))
    this.reach = (SHORTEST_STRIDE + (GALLOP_STRIDE - SHORTEST_STRIDE) * share) / GALLOP_STRIDE
    const stride = GALLOP_STRIDE * this.reach
    const before = this.phase
    this.phase = (this.phase + moved / stride) % 1
    this.strides += moved / stride
    this.time += dt
    const crossed = (at: number) => {
      const a = before
      const b = this.phase < before ? this.phase + 1 : this.phase
      return (a < at && at <= b) || (a < at + 1 && at + 1 <= b)
    }
    const curve = this.curveFeet(body)
    this.feet = STRIDE.map(({ lands, lifts }, i) => {
      const here = curve[i]!
      // Lifting, it comes off where it stood onto its curve.
      const stood = this.down[i]
      if (crossed(lifts) && stood) {
        this.down[i] = null
        this.offsets[i] = {
          x: stood.x - here.x,
          z: stood.z - here.z,
          up: -here.lift,
          from: this.strides,
          until: this.strides + LIFT_ONTO_CURVE,
        }
      }
      const off = this.offsets[i]!
      const k = Math.min(1, Math.max(0, (this.strides - off.from) / (off.until - off.from)))
      const fade = 1 - k * k * (3 - 2 * k)
      const air = {
        ...here,
        x: here.x + off.x * fade,
        z: here.z + off.z * fade,
        lift: Math.max(0, here.lift + off.up * fade),
      }
      // Landing it stays where it comes down until it lifts again.
      if (crossed(lands)) this.down[i] = { x: air.x, z: air.z, yaw: body.heading }
      const down = this.down[i]
      return down
        ? { ...down, lift: 0, swing: null, stance: 0, step: 0, yaw: down.yaw }
        : { ...air, yaw: body.heading }
    })
    const carried = this.carried()
    const legs = dogLegs(this.feet, body, carried)
    // Head and neck stretched forward, the tail streaming out behind.
    const k = this.settled()
    const pose: Pose = {
      ...DOG_POSTURES.stand,
      ...legs,
      trunk: carried.pitch,
      loin: carried.flex,
      neck: lerp(TROT_HEAD.neck, 1.15, k),
      head: lerp(TROT_HEAD.head, -0.8, k),
      tail: lerp(DOG_POSTURES.stand.tail ?? 0, -0.2 - carried.flex, k),
    }
    this.pose = pose
    // Off the ground between the strides: the trunk as high as the stride carries it.
    return { pose, lift: Math.max(0, carried.height + lowestPoint(DOG, pose)), feet: this.feet }
  }

  /** How far into the gallop the trunk is carried (0 trotting as it set off, 1 galloping). */
  private settled() {
    return 1 - Math.exp(-this.time / BLEND)
  }

  /** How the trunk is carried now: as the stride carries it, blended from the trot on entering. */
  carried(): Carriage {
    const k = this.settled()
    const now = carriage(this.phase, this.reach)
    return {
      height: lerp(TROT_CARRIAGE.height, now.height, k),
      pitch: lerp(TROT_CARRIAGE.pitch, now.pitch, k),
      flex: lerp(TROT_CARRIAGE.flex, now.flex, k),
    }
  }
}

import { describe, expect, test } from 'bun:test'

import { ANIMATED_CARDS, animationFor } from '../figures/animated'
import { DOG, DOG_POSTURES, type DogPosture } from '../figures/dog'
import {
  ExercisePlayer,
  cardPlace,
  stationOf,
  type Exercise,
  type ExerciseFrame,
} from '../figures/exercise'
import { HANDLER, HANDLER_STAND } from '../figures/handler'
import { apply } from '../figures/math'
import { jointFrames, jointNames, lowestPoint, type Joint, type Pose } from '../figures/rig'
import { EXERCISES } from '../figures/exercises'
import {
  Z001,
  Z002,
  Z003,
  Z004,
  Z005,
  Z006,
  Z007,
  Z008,
  Z009,
  Z011,
  Z012,
  Z013,
  Z014_D0A,
  Z015,
  Z016,
  Z017,
} from '../figures/roz-exercises'
import { TeamAnimator, onField } from '../figures/team'

/** The figure with only the named top-level limbs (and no root boxes). */
const only = (rig: Joint, names: string[]): Joint => ({
  ...rig,
  boxes: [],
  children: (rig.children ?? []).filter((c) => names.includes(c.name)),
})

/** Height above the ground of a part, with the whole figure standing on the ground. */
const clearance = (rig: Joint, pose: Pose, part: Joint) =>
  lowestPoint(part, pose) - lowestPoint(rig, pose)

const playAll = (exercise: Exercise) => {
  const player = new ExercisePlayer(exercise)
  const frames = [player.step(0)]
  while (!frames.at(-1)!.finished && frames.length < 60 * 60) frames.push(player.step(1 / 60))
  return frames
}

/** A point of a joint (in the joint's frame) on the field, the figure standing on the ground. */
const onGround = (
  rig: Joint,
  pose: Pose,
  place: { x: number; z: number; heading: number },
  joint: string,
  point: [number, number, number],
) => {
  const frame = jointFrames(rig, pose).get(joint)!
  const p = apply(frame.rotation, point)
  const x = frame.position[0] + p[0]
  const z = frame.position[2] + p[2]
  const c = Math.cos(place.heading)
  const s = Math.sin(place.heading)
  return {
    x: place.x + c * x + s * z,
    y: frame.position[1] + p[1] - lowestPoint(rig, pose),
    z: place.z - s * x + c * z,
  }
}

const PAWS = ['leftFrontPaw', 'rightFrontPaw', 'leftHindPaw', 'rightHindPaw']

type V3 = [number, number, number]
/** A figure's box on the field: centre, axes, half sizes, and a sphere round it. */
type Solid = { joint: string; c: V3; axes: [V3, V3, V3]; half: V3; radius: number }

/** A figure's boxes on the field as drawn (standing on the ground, lifted if it runs). */
const solids = (
  rig: Joint,
  figure: { pose: Pose; x: number; z: number; heading: number; lift?: number },
): Solid[] => {
  const up = -lowestPoint(rig, figure.pose) + (figure.lift ?? 0)
  const c = Math.cos(figure.heading)
  const s = Math.sin(figure.heading)
  const field = (v: readonly number[]): V3 => [c * v[0]! + s * v[2]!, v[1]!, -s * v[0]! + c * v[2]!]
  const out: Solid[] = []
  for (const { joint, position, rotation } of jointFrames(rig, figure.pose).values())
    for (const box of joint.boxes) {
      const at = apply(rotation, box.at)
      const p = field([position[0] + at[0], position[1] + at[1] + up, position[2] + at[2]])
      const half: V3 = [box.size[0] / 2, box.size[1] / 2, box.size[2] / 2]
      out.push({
        joint: joint.name,
        c: [figure.x + p[0], p[1], figure.z + p[2]],
        axes: [
          field(apply(rotation, [1, 0, 0])),
          field(apply(rotation, [0, 1, 0])),
          field(apply(rotation, [0, 0, 1])),
        ],
        half,
        radius: Math.hypot(...half),
      })
    }
  return out
}

/** The widest gap between two boxes along any separating axis (negative: they overlap). */
const separation = (a: Solid, b: Solid) => {
  const d: V3 = [b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2]]
  const far = Math.hypot(...d) - a.radius - b.radius
  if (far > 0) return far
  const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
  const axes: V3[] = [...a.axes, ...b.axes]
  for (const u of a.axes)
    for (const v of b.axes) {
      const w: V3 = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ]
      const n = Math.hypot(...w)
      if (n > 1e-6) axes.push([w[0] / n, w[1] / n, w[2] / n])
    }
  let widest = -Infinity
  for (const axis of axes) {
    const ra = a.axes.reduce((sum, u, i) => sum + a.half[i]! * Math.abs(dot(u, axis)), 0)
    const rb = b.axes.reduce((sum, u, i) => sum + b.half[i]! * Math.abs(dot(u, axis)), 0)
    widest = Math.max(widest, Math.abs(dot(d, axis)) - ra - rb)
  }
  return widest
}

type Point = { x: number; y: number; z: number }

/** The closest two segments `a`–`b` and `c`–`d` come. */
const segmentsApart = (a: Point, b: Point, c: Point, d: Point) => {
  let closest = Infinity
  const at = (p: Point, q: Point, t: number) => ({
    x: p.x + (q.x - p.x) * t,
    y: p.y + (q.y - p.y) * t,
    z: p.z + (q.z - p.z) * t,
  })
  for (let i = 0; i <= 20; i++)
    for (let j = 0; j <= 20; j++) {
      const p = at(a, b, i / 20)
      const q = at(c, d, j / 20)
      closest = Math.min(closest, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z))
    }
  return closest
}

/** The handler's legs as drawn: thighs, shins and shoes as segments, with their widths. */
const legParts = (frame: ExerciseFrame, side: 'left' | 'right') => {
  const at = onField(frame.team, frame.handler)
  const point = (joint: string, p: [number, number, number]) =>
    onGround(HANDLER, frame.handler.pose, at, `${side}${joint}`, p)
  return [
    { width: 0.15, ends: [point('Hip', [0, 0, 0]), point('Knee', [0, 0, 0])] },
    { width: 0.12, ends: [point('Knee', [0, 0, 0]), point('Foot', [0, 0, 0])] },
    { width: 0.11, ends: [point('Foot', [0, -0.04, -0.06]), point('Foot', [0, -0.04, 0.18])] },
  ]
}

/**
 * How far each planted foot is, as drawn, from where it stands on the ground: the handler's
 * heel or toes (whichever carries the weight), the dog's paws while on its legs.
 */
const misses = (frame: ExerciseFrame) => {
  const handlerAt = onField(frame.team, frame.handler)
  const dogAt = onField(frame.team, frame.dog)
  const out: { who: string; miss: number }[] = []
  frame.feet.handler.forEach((foot, i) => {
    if (foot.swing !== null) return
    const joint = i === 0 ? 'leftFoot' : 'rightFoot'
    const heel = onGround(HANDLER, frame.handler.pose, handlerAt, joint, [0, -0.08, -0.08])
    const toe = onGround(HANDLER, frame.handler.pose, handlerAt, joint, [0, -0.08, 0.2])
    const toeX = foot.x + Math.sin(foot.yaw) * 0.28
    const toeZ = foot.z + Math.cos(foot.yaw) * 0.28
    const miss = Math.min(
      Math.hypot(heel.x - foot.x, heel.z - foot.z, heel.y),
      Math.hypot(toe.x - toeX, toe.z - toeZ, toe.y),
    )
    out.push({ who: joint, miss })
  })
  if (frame.feet.dogOnLegs)
    frame.feet.dog.forEach((paw, i) => {
      if (paw.swing !== null) return
      const at = onGround(DOG, frame.dog.pose, dogAt, PAWS[i]!, [0, 0, 0])
      out.push({ who: PAWS[i]!, miss: Math.hypot(at.x - paw.x, at.z - paw.z, at.y - 0.04) })
    })
  return out
}

describe('rigs', () => {
  test.each([
    ['dog', DOG],
    ['handler', HANDLER],
  ])('%s joint names are unique (the renderer keys groups by name)', (_, rig) => {
    const names = jointNames(rig)
    expect(new Set(names).size).toBe(names.length)
  })

  test('postures only move existing joints', () => {
    const dogJoints = new Set(jointNames(DOG))
    const handlerJoints = new Set(jointNames(HANDLER))
    for (const pose of Object.values(DOG_POSTURES))
      for (const name of Object.keys(pose)) expect(dogJoints.has(name.split('.')[0]!)).toBe(true)
    for (const name of Object.keys(HANDLER_STAND))
      expect(handlerJoints.has(name.split('.')[0]!)).toBe(true)
  })

  test('level joints stay level whatever the leg above does', () => {
    const paw = jointFrames(DOG, DOG_POSTURES.sit).get('leftFrontPaw')!
    // The paw's up axis is still up.
    expect(paw.rotation[4]).toBeCloseTo(1, 5)
  })
})

describe('dog postures', () => {
  const front = only(DOG, ['leftShoulder', 'rightShoulder'])
  const hind = only(DOG, ['leftHip', 'rightHip'])
  const trunk = { ...DOG, children: [] }

  test.each<DogPosture>(['stand', 'sit'])('%s: all four paws on the ground', (posture) => {
    const pose = DOG_POSTURES[posture]
    expect(clearance(DOG, pose, front)).toBeLessThan(0.02)
    expect(clearance(DOG, pose, hind)).toBeLessThan(0.02)
  })

  test('stand: the trunk is level and well off the ground', () => {
    expect(clearance(DOG, DOG_POSTURES.stand, trunk)).toBeGreaterThan(0.25)
  })

  test('sit: rump down, chest up', () => {
    expect(clearance(DOG, DOG_POSTURES.sit, trunk)).toBeLessThan(0.05)
    expect(DOG_POSTURES.sit.trunk).toBeLessThan(-0.5)
  })

  test('down: the trunk lies on the ground', () => {
    expect(clearance(DOG, DOG_POSTURES.down, trunk)).toBeLessThan(0.02)
    expect(clearance(DOG, DOG_POSTURES.down, front)).toBeLessThan(0.05)
  })
})

/**
 * The author's rule: any move of the body is made by the legs — a foot on the ground stays
 * where it is, the body moves and turns by stepping. Checked on every frame of every
 * exercise, as drawn.
 */
describe.each(EXERCISES.map((e) => [e.code, e] as const))('%s: feet', (_, exercise) => {
  const frames = playAll(exercise)

  test('a planted foot or paw never slides: the legs reach it where it stands', () => {
    for (const frame of frames)
      for (const { who, miss } of misses(frame))
        if (miss > (who.endsWith('Paw') ? 0.01 : 0.005))
          throw new Error(`${who} drawn ${(miss * 100).toFixed(1)} cm off (${frame.caption})`)
  })

  test("the handler's legs never cross or pass through each other", () => {
    for (const frame of frames) {
      const left = legParts(frame, 'left')
      const right = legParts(frame, 'right')
      for (const l of left)
        for (const r of right) {
          const apart = segmentsApart(l.ends[0]!, l.ends[1]!, r.ends[0]!, r.ends[1]!)
          // Boxes drawn round segments: a little leeway for their corners.
          if (apart < (l.width + r.width) / 2 - 0.02)
            throw new Error(`legs ${(apart * 100).toFixed(1)} cm apart (${frame.caption})`)
        }
    }
  })

  test('the handler and the dog never pass through each other', () => {
    for (const frame of frames) {
      const handler = solids(HANDLER, frame.handler)
      const dog = solids(DOG, frame.dog)
      for (const a of handler)
        for (const b of dog) {
          // The boxes overlap by this much at least (a thin box a hair into another: leeway).
          const overlap = -separation(a, b)
          if (overlap > 0.005)
            throw new Error(
              `${a.joint} ${(overlap * 100).toFixed(1)} cm into the dog's ${b.joint} (${frame.caption})`,
            )
        }
    }
  })

  test("the handler's arms and trunk move on smoothly, never at once", () => {
    const parts = ['spine', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow']
    for (let i = 1; i < frames.length; i++)
      for (const part of parts) {
        const now = frames[i]!.handler.pose[part] ?? 0
        const before = frames[i - 1]!.handler.pose[part] ?? 0
        // A runner's arm swings some 250° a second at most: about 4° a frame.
        if (Math.abs(now - before) > 0.09)
          throw new Error(`${part} jumps ${(Math.abs(now - before) * 57.3).toFixed(1)}°`)
      }
  })

  test('joints stay within what a human and a dog can do', () => {
    const deg = Math.PI / 180
    for (const { handler, dog } of frames) {
      // The ankle: between the shin and the foot about a right angle — bent up 35° at most
      // (a lunge), stretched down 40° at most.
      const legs = jointFrames(HANDLER, handler.pose)
      for (const side of ['left', 'right']) {
        const knee = legs.get(`${side}Knee`)!.position
        const foot = legs.get(`${side}Foot`)!
        const shin = knee.map((v, i) => v - foot.position[i]!)
        const toes = apply(foot.rotation, [0, 0, 1])
        const cos = shin.reduce((sum, v, i) => sum + v * toes[i]!, 0) / Math.hypot(...shin)
        const ankle = Math.acos(cos) / deg
        expect(ankle).toBeGreaterThan(55)
        expect(ankle).toBeLessThan(130)
      }
      for (const side of ['left', 'right']) {
        const out = side === 'left' ? 1 : -1
        expect(Math.abs(handler.pose[`${side}Hip.yaw`] ?? 0)).toBeLessThanOrEqual(40 * deg + 1e-9)
        expect(out * (handler.pose[`${side}Hip.roll`] ?? 0)).toBeLessThanOrEqual(26 * deg)
        expect(out * (handler.pose[`${side}Hip.roll`] ?? 0)).toBeGreaterThanOrEqual(-20.5 * deg)
        // Knees bend forward only, elbows of the forelegs back only.
        expect(handler.pose[`${side}Knee`] ?? 0).toBeGreaterThanOrEqual(-1e-9)
        expect(dog.pose[`${side}Elbow`] ?? 0).toBeLessThanOrEqual(1e-9)
        for (const joint of [`${side}Shoulder`, `${side}Hip`]) {
          expect(Math.abs(dog.pose[`${joint}.yaw`] ?? 0)).toBeLessThanOrEqual(20.1 * deg)
          expect(Math.abs(dog.pose[`${joint}.roll`] ?? 0)).toBeLessThanOrEqual(20.1 * deg)
        }
      }
    }
  })
})

describe('walking', () => {
  // Walking on at a steady normal pace.
  const walk = playAll(Z001).filter((f) => f.caption === 'approach' && f.speed > 1.1)

  test('the handler lifts each foot clear of the ground', () => {
    for (const i of [0, 1])
      expect(Math.max(...walk.map((f) => f.feet.handler[i]!.lift))).toBeGreaterThan(0.08)
  })

  test('the hips do not bounce', () => {
    const heights = walk.map((f) => -lowestPoint(HANDLER, f.handler.pose))
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.05)
  })

  test('the dog trots: diagonal paws move together', () => {
    const swinging = walk.map((f) => f.feet.dog.map((p) => p.swing !== null))
    const together = swinging.filter((s) => s[0] === s[3] && s[1] === s[2]).length
    expect(together / swinging.length).toBeGreaterThan(0.9)
  })

  test.each(EXERCISES.map((e) => [e.code, e] as const))(
    '%s: standing, the handler has both feet down and the dog all four paws',
    (_, exercise) => {
      // From the moment the team stands in a position until it walks on (the first frames
      // of a standing step may still finish the last step).
      const standing = ['basePosition', 'downHold', 'aroundDone', 'aroundDoneDown', 'stay']
      const frames = playAll(exercise).filter((f) => standing.includes(f.caption ?? ''))
      for (const f of frames.slice(20)) {
        for (const foot of f.feet.handler) expect(foot.swing).toBeNull()
        if (f.feet.dogOnLegs) for (const paw of f.feet.dog) expect(paw.swing).toBeNull()
      }
    },
  )

  test('the handler stands on both feet when standing', () => {
    for (const leg of ['leftHip', 'rightHip'])
      expect(clearance(HANDLER, HANDLER_STAND, only(HANDLER, [leg]))).toBeLessThan(0.001)
  })
})

describe('TeamAnimator', () => {
  test('settles on the requested posture and place', () => {
    const animator = new TeamAnimator()
    let frame = animator.step(0, { dog: 'stand', place: 'left', handler: 'stand' })
    for (let i = 0; i < 120; i++)
      frame = animator.step(1 / 30, { dog: 'sit', place: 'front', handler: 'stand' })
    expect(frame.dog.pose.trunk).toBeCloseTo(DOG_POSTURES.sit.trunk ?? NaN, 2)
    // Facing the handler (turned half round, whichever way).
    expect(Math.cos(frame.dog.heading)).toBeCloseTo(-1, 3)
    expect(frame.dog.z).toBeGreaterThan(0.5)
  })

  test('the team moves only while the handler walks', () => {
    const animator = new TeamAnimator()
    const still = animator.step(1, { dog: 'stand', place: 'left', handler: 'stand' })
    expect(still.travelled).toBe(0)
    let moving = still
    for (let i = 0; i < 10; i++)
      moving = animator.step(0.05, { dog: 'trot', place: 'left', handler: 'normal' })
    expect(moving.travelled).toBeGreaterThan(0)
  })
})

describe('Z-002 Stop – lehni', () => {
  test('sits, then lies down beside the standing handler, then walks on', () => {
    const player = new ExercisePlayer(Z002)
    const frames = [player.step(0)]
    while (!frames.at(-1)!.finished && frames.length < 60 * 60) frames.push(player.step(1 / 60))
    const station = stationOf(Z002)
    const captions = [...new Set(frames.map((f) => f.caption))]
    expect(captions.indexOf('sit')).toBeLessThan(captions.indexOf('down'))
    const down = frames.filter((f) => f.caption === 'downHold')
    expect(down.length).toBeGreaterThan(60)
    for (const f of down) {
      expect(Math.abs(f.travelled - station)).toBeLessThan(0.03)
      expect(f.dog.x).toBeGreaterThan(0.3)
      // Lying: the trunk level, close to the ground.
      expect(clearance(DOG, f.dog.pose, { ...DOG, children: [] })).toBeLessThan(0.03)
    }
    expect(frames.at(-1)!.travelled - station).toBeGreaterThan(2.5)
  })
})

describe('Z-003 Stop – lehni – sedni', () => {
  test('sit, down, sit again, then walks on', () => {
    const frames = playAll(Z003)
    const captions = frames.map((f) => f.caption).filter((c, i, all) => c !== all[i - 1])
    expect(captions).toEqual([
      'approach',
      'stop',
      'sit',
      'basePosition',
      'down',
      'downHold',
      'sitAgain',
      'basePosition',
      'leave',
      null,
    ])
    const lastHold = frames.findLast((f) => f.caption === 'basePosition')!
    expect(lastHold.dog.pose.trunk).toBeCloseTo(DOG_POSTURES.sit.trunk ?? NaN, 1)
  })
})

describe('Z-004 Stop – okolo psa', () => {
  const frames = playAll(Z004)
  const around = frames.filter((f) => f.caption === 'aroundDog')

  test('the dog keeps sitting and the team stays put while the handler walks around', () => {
    expect(around.length / 60).toBeGreaterThan(2.5)
    const station = stationOf(Z004)
    for (const f of around) {
      expect(Math.abs(f.travelled - station)).toBeLessThan(0.03)
      expect(f.dog.pose.trunk).toBeCloseTo(DOG_POSTURES.sit.trunk ?? NaN, 1)
    }
  })

  test('goes round in front of the dog first, never through it', () => {
    // In front of the dog (ahead, on its side) before behind it.
    const firstAhead = around.findIndex((f) => f.handler.z > 0.5 && f.handler.x > 0.3)
    const firstBehind = around.findIndex((f) => f.handler.z < -0.5 && f.handler.x > 0.3)
    expect(firstAhead).toBeGreaterThan(-1)
    expect(firstBehind).toBeGreaterThan(firstAhead)
    // The sitting dog takes about x 0.32–0.52, z −0.55–0.25; the handler is ~0.2 m wide.
    for (const { handler: h } of around) {
      const dx = Math.max(0.32 - h.x, 0, h.x - 0.52)
      const dz = Math.max(-0.55 - h.z, 0, h.z - 0.25)
      expect(Math.hypot(dx, dz)).toBeGreaterThan(0.15)
    }
  })

  test('ends back in the base position, facing ahead', () => {
    const done = frames.filter((f) => f.caption === 'aroundDone').at(-1)!
    expect(Math.abs(done.handler.x)).toBeLessThan(0.02)
    expect(Math.abs(done.handler.z)).toBeLessThan(0.02)
    expect(Math.abs(done.handler.heading)).toBeLessThan(0.05)
  })
})

/** How far a point is from the segment a–b on the ground. */
const toSegment = (
  p: { x: number; z: number },
  a: { x: number; z: number },
  b: { x: number; z: number },
) => {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz)
}

/** The dog's parts that reach out furthest. */
const DOG_REACH = ['head', 'leftFrontPaw', 'rightFrontPaw', 'leftHindPaw', 'rightHindPaw']

describe('every exercise', () => {
  /** A team-frame point (handler's base place at the origin) on the field. */
  const onField = (team: { x: number; z: number; heading: number }, x: number, z: number) => ({
    x: team.x + x * Math.cos(team.heading) + z * Math.sin(team.heading),
    z: team.z - x * Math.sin(team.heading) + z * Math.cos(team.heading),
  })

  test.each(EXERCISES.map((e) => [e.code, e] as const))('%s plays to the end', (_, exercise) => {
    const frames = playAll(exercise)
    expect(frames.at(-1)!.finished).toBe(true)
    expect(frames.length / 60).toBeLessThan(40)
  })

  test.each(EXERCISES.map((e) => [e.code, e] as const))(
    '%s: nobody walks through the card',
    (_, exercise) => {
      const station = stationOf(exercise)
      const place = cardPlace(exercise)
      const card = { x: place.x, z: station + place.z }
      for (const f of playAll(exercise)) {
        const handler = onField(f.team, f.handler.x, f.handler.z)
        const dog = onField(f.team, f.dog.x, f.dog.z)
        expect(Math.hypot(handler.x - card.x, handler.z - card.z)).toBeGreaterThan(0.4)
        expect(Math.hypot(dog.x - card.x, dog.z - card.z)).toBeGreaterThan(0.35)
        // The dog's head and paws stay off the stand: 0.5 m wide facing the team, its tent
        // reaching about 0.3 m back (1-116's dog ran through it going round the handler).
        const frames = jointFrames(DOG, f.dog.pose)
        const heading = f.team.heading + f.dog.heading
        for (const joint of DOG_REACH) {
          const [x, , z] = frames.get(joint)!.position
          const at = {
            x: dog.x + x * Math.cos(heading) + z * Math.sin(heading),
            z: dog.z - x * Math.sin(heading) + z * Math.cos(heading),
          }
          const dx = Math.max(0, Math.abs(at.x - card.x) - 0.25)
          const dz = Math.max(0, card.z - at.z, at.z - card.z - 0.3)
          expect(Math.hypot(dx, dz)).toBeGreaterThan(0.02)
        }
        // …nor knocks over a cone (the bodies' middles, a body's half width off it).
        for (const cone of [...(exercise.cones ?? []), ...(exercise.bowls ?? [])]) {
          const at = { x: cone.x, z: station + cone.z }
          expect(Math.hypot(handler.x - at.x, handler.z - at.z)).toBeGreaterThan(0.3)
          expect(Math.hypot(dog.x - at.x, dog.z - at.z)).toBeGreaterThan(0.25)
          // Nor does a shoe or a paw step on one (2-220: a shoe went through a bowl). A
          // cone stands on a 24 cm plate, a bowl is 22 cm across; a shoe is 26 cm heel to
          // toe and 11 cm wide.
          for (const foot of f.feet.handler) {
            const toe = {
              x: foot.x + 0.26 * Math.sin(foot.yaw),
              z: foot.z + 0.26 * Math.cos(foot.yaw),
            }
            expect(toSegment(at, foot, toe)).toBeGreaterThan(0.12 + 0.055)
          }
          for (const paw of f.feet.dog)
            expect(Math.hypot(paw.x - at.x, paw.z - at.z)).toBeGreaterThan(0.12 + 0.035)
        }
      }
    },
  )

  test.each([
    [Z006, 90],
    [Z007, -90],
    [Z008, 180],
    [Z009, -180],
    [Z011, 270],
    [Z012, -270],
    [Z013, 360],
  ] as const)('%#: turns by the card’s angle and walks on that way', (exercise, degrees) => {
    const frames = playAll(exercise)
    const end = frames.at(-1)!
    // Right turns decrease the heading (towards −x, the handler's right).
    expect(end.team.heading).toBeCloseTo((-degrees * Math.PI) / 180, 3)
    // Then 3 m on in the new direction.
    const turned = frames.findLast((f) => f.caption?.startsWith('turn'))!
    expect(Math.hypot(end.team.x - turned.team.x, end.team.z - turned.team.z)).toBeGreaterThan(2.5)
  })

  test.each([Z006, Z007, Z008, Z009].map((e) => [e.code, e] as const))(
    '%s: turns in a small arc right in front of the card, without stopping',
    (_, exercise) => {
      const frames = playAll(exercise)
      const turning = frames.filter((f) => f.caption?.startsWith('turn'))
      for (const f of turning) {
        expect(f.speed).toBeGreaterThan(0.3)
        // The handler stays within the arc's reach of the station.
        expect(Math.hypot(f.team.x, f.team.z - stationOf(exercise))).toBeLessThan(0.75)
      }
    },
  )

  test.each([Z011, Z012, Z013].map((e) => [e.code, e] as const))(
    '%s: the handler turns on the spot, the dog stays at heel',
    (_, exercise) => {
      const frames = playAll(exercise)
      // From where the team has come to rest before turning.
      const turning = frames.filter((f) => f.caption?.startsWith('turn'))
      const still = turning.findIndex((f) => f.speed < 0.1)
      const start = turning[still]!.team
      for (const f of turning.slice(still)) {
        expect(Math.hypot(f.team.x - start.x, f.team.z - start.z)).toBeLessThan(0.02)
        // At heel — going round the outside, a moment behind, as fast as its legs carry it.
        expect(Math.hypot(f.dog.x - 0.42, f.dog.z + 0.2)).toBeLessThan(0.15)
      }
    },
  )
})

describe('Z-005 Stop – lehni – okolo psa', () => {
  test('the dog keeps lying while the handler walks around it', () => {
    const around = playAll(Z005).filter((f) => f.caption === 'aroundLyingDog')
    expect(around.length / 60).toBeGreaterThan(2.5)
    for (const f of around)
      expect(clearance(DOG, f.dog.pose, { ...DOG, children: [] })).toBeLessThan(0.03)
  })
})

describe('Z-001 Stop', () => {
  const play = () => {
    const player = new ExercisePlayer(Z001)
    const frames = [player.step(0)]
    while (!frames.at(-1)!.finished && frames.length < 60 * 60) frames.push(player.step(1 / 60))
    return frames
  }

  test('plays to the end in a few seconds', () => {
    const frames = play()
    expect(frames.at(-1)!.finished).toBe(true)
    expect(frames.length / 60).toBeLessThan(15)
  })

  test('the team stops where the script says and stands still in the base position', () => {
    const frames = play()
    const station = stationOf(Z001)
    expect(station).toBeCloseTo(3.5, 1)
    const held = frames.filter((f) => f.caption === 'basePosition')
    expect(held.length).toBeGreaterThan(60)
    for (const f of held) {
      expect(Math.abs(f.travelled - station)).toBeLessThan(0.03)
      // Dog sits at the handler's left, shoulder blade level with the handler's leg.
      expect(f.dog.pose.trunk).toBeCloseTo(DOG_POSTURES.sit.trunk ?? NaN, 1)
      expect(f.dog.x).toBeGreaterThan(0.3)
    }
  })

  test('the dog sits half a second after the handler stops', () => {
    const frames = play()
    const stop = frames.findIndex((f) => f.caption === 'stop')
    const sit = frames.findIndex((f) => f.caption === 'sit')
    expect((sit - stop) / 60).toBeCloseTo(0.5, 1)
  })

  test('walks on after the stop', () => {
    const frames = play()
    expect(frames.at(-1)!.travelled - stationOf(Z001)).toBeGreaterThan(2.5)
  })
})

describe('Z-014 Předsednutí', () => {
  const frames = playAll(Z014_D0A)

  test('the dog sits in front, facing the handler, who does not move the feet', () => {
    const sitting = frames.filter((f) => f.caption === 'frontHold')
    expect(sitting.length).toBeGreaterThan(30)
    for (const f of sitting) {
      expect(Math.abs(f.dog.x)).toBeLessThan(0.05)
      expect(f.dog.z).toBeGreaterThan(0.5)
      expect(Math.cos(f.dog.heading)).toBeLessThan(-0.99)
      expect(f.feet.handler.every((foot) => foot.swing === null)).toBe(true)
    }
  })

  test('D0a: the dog runs round the handler’s right side into heel', () => {
    const around = frames.filter((f) => f.caption === 'finishAround')
    expect(Math.min(...around.map((f) => f.dog.x))).toBeLessThan(-0.35)
    expect(Math.min(...around.map((f) => f.dog.z))).toBeLessThan(-0.4)
    const sat = frames.findLast((f) => f.caption === 'basePosition')!
    expect(sat.dog.x).toBeCloseTo(0.42, 1)
    expect(sat.dog.z).toBeCloseTo(-0.2, 1)
  })
})

describe('Z-015–Z-017 paces', () => {
  const held = (exercise: Exercise, caption: string) =>
    playAll(exercise).filter((f) => f.caption === caption)

  test('slow: the team walks slowly, the dog at a walk', () => {
    const slow = held(Z015, 'paceHold')
    expect(Math.max(...slow.map((f) => f.speed))).toBeLessThan(0.6)
    // A walking dog has three paws down most of the time.
    const threeDown = slow.filter((f) => f.feet.dog.filter((p) => p.swing === null).length >= 3)
    expect(threeDown.length / slow.length).toBeGreaterThan(0.5)
  })

  test('fast: the handler runs — between steps both feet are in the air', () => {
    const fast = held(Z016, 'paceHold')
    expect(Math.min(...fast.map((f) => f.speed))).toBeGreaterThan(1.9)
    const flying = fast.filter((f) => f.feet.handler.every((foot) => foot.swing !== null))
    expect(flying.length / fast.length).toBeGreaterThan(0.15)
    // …and lands again: never long in the air.
    expect(flying.length / fast.length).toBeLessThan(0.45)
  })

  test('walking, the handler always has a foot on the ground', () => {
    for (const f of [...playAll(Z001), ...playAll(Z015), ...playAll(Z017)])
      expect(f.feet.handler.some((foot) => foot.swing === null)).toBe(true)
  })

  test('normal: from slow back to a normal walk', () => {
    const normal = held(Z017, 'leave')
    expect(normal.at(-1)!.speed).toBeGreaterThan(1.05)
  })
})

describe('animations in the card details', () => {
  test('every scripted card is listed as animated, and nothing else', () => {
    expect([...ANIMATED_CARDS].sort()).toEqual([...new Set(EXERCISES.map((e) => e.code))].sort())
  })

  test('a supplementary card plays Z-014 ending with it; others have none', () => {
    expect(animationFor('D0c')).toEqual({ code: 'Z-014', variant: 'D0c' })
    expect(animationFor('Z-022')).toEqual({ code: 'Z-022' })
    expect(animationFor('1-102')).toBeNull()
    for (const d0 of ['D0a', 'D0b', 'D0c', 'D0d'])
      expect(EXERCISES.some((e) => e.code === 'Z-014' && e.supplementary === d0)).toBe(true)
  })
})

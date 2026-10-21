import { describe, expect, test } from 'bun:test'

import { DOG, DOG_POSTURES, type DogPosture } from '../figures/dog'
import { ExercisePlayer, stationOf, type Exercise, type ExerciseFrame } from '../figures/exercise'
import { HANDLER, HANDLER_STAND } from '../figures/handler'
import { apply } from '../figures/math'
import { jointFrames, jointNames, lowestPoint, type Joint, type Pose } from '../figures/rig'
import {
  EXERCISES,
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

  test('joints stay within what a human and a dog can do', () => {
    const deg = Math.PI / 180
    for (const { handler, dog } of frames) {
      for (const side of ['left', 'right']) {
        const out = side === 'left' ? 1 : -1
        expect(Math.abs(handler.pose[`${side}Hip.yaw`] ?? 0)).toBeLessThanOrEqual(40 * deg + 1e-9)
        expect(out * (handler.pose[`${side}Hip.roll`] ?? 0)).toBeLessThanOrEqual(26 * deg)
        expect(out * (handler.pose[`${side}Hip.roll`] ?? 0)).toBeGreaterThanOrEqual(-20.5 * deg)
        // Knees bend forward only, elbows of the forelegs back only.
        expect(handler.pose[`${side}Knee`] ?? 0).toBeGreaterThanOrEqual(-1e-9)
        expect(dog.pose[`${side}Elbow`] ?? 0).toBeLessThanOrEqual(1e-9)
        for (const joint of [`${side}Shoulder`, `${side}Hip`]) {
          expect(Math.abs(dog.pose[`${joint}.yaw`] ?? 0)).toBeLessThanOrEqual(20 * deg + 1e-9)
          expect(Math.abs(dog.pose[`${joint}.roll`] ?? 0)).toBeLessThanOrEqual(17.5 * deg)
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
    expect(frame.dog.heading).toBeCloseTo(Math.PI, 2)
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

describe('every RO-Z exercise', () => {
  /** A team-frame point (handler's base place at the origin) on the field. */
  const onField = (team: { x: number; z: number; heading: number }, x: number, z: number) => ({
    x: team.x + x * Math.cos(team.heading) + z * Math.sin(team.heading),
    z: team.z - x * Math.sin(team.heading) + z * Math.cos(team.heading),
  })

  test.each(EXERCISES.map((e) => [e.code, e] as const))('%s plays to the end', (_, exercise) => {
    const frames = playAll(exercise)
    expect(frames.at(-1)!.finished).toBe(true)
    expect(frames.length / 60).toBeLessThan(20)
  })

  test.each(EXERCISES.map((e) => [e.code, e] as const))(
    '%s: nobody walks through the card',
    (_, exercise) => {
      const station = stationOf(exercise)
      const card =
        exercise.card === 'ahead' ? { x: 0, z: station + 1.2 } : { x: -0.75, z: station + 0.45 }
      for (const f of playAll(exercise)) {
        const handler = onField(f.team, f.handler.x, f.handler.z)
        const dog = onField(f.team, f.dog.x, f.dog.z)
        expect(Math.hypot(handler.x - card.x, handler.z - card.z)).toBeGreaterThan(0.4)
        expect(Math.hypot(dog.x - card.x, dog.z - card.z)).toBeGreaterThan(0.35)
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
      const turning = frames.filter((f) => f.caption?.startsWith('turn'))
      const start = turning[0]!.team
      for (const f of turning) {
        expect(Math.hypot(f.team.x - start.x, f.team.z - start.z)).toBeLessThan(0.02)
        expect(f.dog.x).toBeCloseTo(0.42, 1)
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

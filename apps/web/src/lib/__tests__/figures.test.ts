import { describe, expect, test } from 'bun:test'

import { DOG, DOG_POSTURES, dogGait, type DogPosture } from '../figures/dog'
import { ExercisePlayer, stationOf, type Exercise } from '../figures/exercise'
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
import {
  HANDLER,
  HANDLER_GAITS,
  HANDLER_PACE,
  HANDLER_STAND,
  HEEL,
  TOE,
  handlerGait,
  type HandlerPace,
} from '../figures/handler'
import {
  jointFrames,
  jointNames,
  lowestPoint,
  pitchPoint,
  resolvePose,
  type Joint,
  type Pose,
} from '../figures/rig'
import { TeamAnimator } from '../figures/team'

/** The figure with only the named top-level limbs (and no root boxes). */
const only = (rig: Joint, names: string[]): Joint => ({
  ...rig,
  boxes: [],
  children: (rig.children ?? []).filter((c) => names.includes(c.name)),
})

/** Height above the ground of a part, with the whole figure standing on the ground. */
const clearance = (rig: Joint, pose: Pose, part: Joint) =>
  lowestPoint(part, pose) - lowestPoint(rig, pose)

describe('rigs', () => {
  test.each([
    ['dog', DOG],
    ['handler', HANDLER],
  ])('%s joint names are unique (the renderer keys groups by name)', (_, rig) => {
    const names = jointNames(rig)
    expect(new Set(names).size).toBe(names.length)
  })

  test('gaits and postures only move existing joints', () => {
    const dogJoints = new Set(jointNames(DOG))
    const handlerJoints = new Set(jointNames(HANDLER))
    for (const pose of [...Object.values(DOG_POSTURES), dogGait('walk', 0.3), dogGait('trot', 0.3)])
      for (const name of Object.keys(pose)) expect(dogJoints).toContain(name)
    for (const pose of [HANDLER_STAND, handlerGait('normal', 0.3), handlerGait('fast', 0.3)])
      for (const name of Object.keys(pose)) expect(handlerJoints).toContain(name)
  })

  test('level joints cancel their parents', () => {
    const angles = resolvePose(DOG, DOG_POSTURES.sit)
    // Trunk + shoulder + elbow + paw = 0: the paw lies flat.
    const chain = ['trunk', 'leftShoulder', 'leftElbow', 'leftFrontPaw']
    expect(chain.reduce((sum, joint) => sum + (angles[joint] ?? NaN), 0)).toBeCloseTo(0)
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

describe('handler', () => {
  test('stands on both feet', () => {
    for (const leg of ['leftHip', 'rightHip'])
      expect(clearance(HANDLER, HANDLER_STAND, only(HANDLER, [leg]))).toBeLessThan(0.001)
  })

  test('walking lifts one foot at a time', () => {
    for (let t = 0; t < 1; t += 0.05) {
      const pose = { ...HANDLER_STAND, ...handlerGait('normal', t) }
      const left = clearance(HANDLER, pose, only(HANDLER, ['leftHip']))
      const right = clearance(HANDLER, pose, only(HANDLER, ['rightHip']))
      expect(Math.min(left, right)).toBeLessThan(0.001)
    }
  })

  test.each<HandlerPace>(['slow', 'normal', 'fast'])(
    '%s: the swinging foot is lifted, not shuffled',
    (pace) => {
      const swing = only(HANDLER, ['leftHip'])
      const highest = Math.max(
        ...Array.from({ length: 40 }, (_, i) => {
          const phase = i / 40
          return clearance(HANDLER, { ...HANDLER_STAND, ...handlerGait(pace, phase) }, swing)
        }),
      )
      expect(highest).toBeGreaterThan(0.08)
    },
  )

  test.each<HandlerPace>(['slow', 'normal', 'fast'])('%s: the hips do not bounce', (pace) => {
    const heights = Array.from({ length: 100 }, (_, i) => {
      const phase = i / 100
      return -lowestPoint(HANDLER, { ...HANDLER_STAND, ...handlerGait(pace, phase) })
    })
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.05)
  })

  test.each<HandlerPace>(['slow', 'normal', 'fast'])(
    '%s: the planted heel, then the toes, stay put on the sliding ground',
    (pace) => {
      const { rate, stance, heelOff } = HANDLER_GAITS[pace]
      const { speed } = HANDLER_PACE[pace]
      // Ground position of a sole corner of the left foot at time t: on the ground (y = 0)
      // and, the ground sliding back at `speed`, at the same spot all the time.
      const corner = (t: number, [cy, cz]: [number, number]) => {
        const pose = { ...HANDLER_STAND, ...handlerGait(pace, t * rate) }
        const foot = jointFrames(HANDLER, pose).get('leftFoot')!
        const [dy, dz] = pitchPoint(cy, cz, foot.pitch)
        return { y: foot.y + dy - lowestPoint(HANDLER, pose), z: foot.z + dz + speed * t }
      }
      for (const [from, to, point] of [
        [0, heelOff * stance, HEEL],
        [(heelOff + 0.01) * stance, stance * 0.99, TOE],
      ] as const) {
        const first = corner(from / rate, point)
        for (let p = from; p <= to; p += 0.01) {
          const now = corner(p / rate, point)
          expect(now.y).toBeLessThan(0.002)
          expect(Math.abs(now.z - first.z)).toBeLessThan(0.005)
        }
      }
    },
  )
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

  test('the ground moves only while the handler walks', () => {
    const animator = new TeamAnimator()
    const still = animator.step(1, { dog: 'stand', place: 'left', handler: 'stand' })
    expect(still.travelled).toBe(0)
    let moving = still
    for (let i = 0; i < 10; i++)
      moving = animator.step(0.05, { dog: 'walk', place: 'left', handler: 'normal' })
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

const playAll = (exercise: Exercise) => {
  const player = new ExercisePlayer(exercise)
  const frames = [player.step(0)]
  while (!frames.at(-1)!.finished && frames.length < 60 * 60) frames.push(player.step(1 / 60))
  return frames
}

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

import { describe, expect, test } from 'bun:test'

import { DOG, DOG_POSTURES, dogGait, type DogPosture } from '../figures/dog'
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
          const t = i / 40 / HANDLER_PACE[pace].rate
          return clearance(HANDLER, { ...HANDLER_STAND, ...handlerGait(pace, t) }, swing)
        }),
      )
      expect(highest).toBeGreaterThan(0.08)
    },
  )

  test.each<HandlerPace>(['slow', 'normal', 'fast'])('%s: the hips do not bounce', (pace) => {
    const heights = Array.from({ length: 100 }, (_, i) => {
      const t = i / 100 / HANDLER_PACE[pace].rate
      return -lowestPoint(HANDLER, { ...HANDLER_STAND, ...handlerGait(pace, t) })
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
        const pose = { ...HANDLER_STAND, ...handlerGait(pace, t) }
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
    expect(still.groundOffset).toBe(0)
    let moving = still
    for (let i = 0; i < 10; i++)
      moving = animator.step(0.05, { dog: 'walk', place: 'left', handler: 'normal' })
    expect(moving.groundOffset).toBeGreaterThan(0)
  })
})

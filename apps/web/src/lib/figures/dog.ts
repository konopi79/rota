import { limitedLeg, type LegLimits } from './ik'
import type { Body, FootSpec, FootState, StepGait } from './locomotion'
import { angleTo } from './math'
import { jointFrames, pitchPoint, type Box, type Joint, type Pose, type Vec3 } from './rig'

/**
 * A medium dog (border collie size, ~53 cm at the withers) out of boxes. The root joint
 * is the centre of the trunk. Paws are marked by side — `leftMark` / `rightMark` — so the
 * plan can tell which leg moves; the handler's shoes use the same two colours.
 */

const box = (size: Vec3, at: Vec3, paint: Box['paint'] = 'coat'): Box => ({ size, at, paint })

/** Leg segments, metres: foreleg upper and lower, hind thigh, shin and hock. */
const FORE_UPPER = 0.17
const FORE_LOWER = 0.18
const THIGH = 0.16
const SHIN = 0.16
const HOCK = 0.09

const paw = (side: 'left' | 'right'): Joint => ({
  name: '',
  pivot: [0, 0, 0],
  level: true,
  boxes: [box([0.07, 0.04, 0.09], [0, -0.02, 0.02], side === 'left' ? 'leftMark' : 'rightMark')],
})

const frontLeg = (side: 'left' | 'right', x: number): Joint => ({
  name: `${side}Shoulder`,
  pivot: [x, -0.05, 0.22],
  boxes: [box([0.07, 0.19, 0.08], [0, -0.075, 0])],
  children: [
    {
      name: `${side}Elbow`,
      pivot: [0, -FORE_UPPER, 0],
      boxes: [box([0.06, FORE_LOWER, 0.06], [0, -FORE_LOWER / 2, 0])],
      children: [{ ...paw(side), name: `${side}FrontPaw`, pivot: [0, -FORE_LOWER, 0] }],
    },
  ],
})

/**
 * Where the loin bends (the back arching and stretching in a gallop), from the trunk's
 * middle; the hind quarters hang from it.
 */
export const LOIN: Vec3 = [0, 0, -0.06]
/** The hips, from the trunk's middle (with the loin straight). */
const HIP: Vec3 = [0, -0.04, -0.22]

const hindLeg = (side: 'left' | 'right', x: number): Joint => ({
  name: `${side}Hip`,
  pivot: [x, HIP[1] - LOIN[1], HIP[2] - LOIN[2]],
  boxes: [box([0.08, 0.2, 0.11], [0, -0.07, 0])],
  children: [
    {
      name: `${side}Stifle`,
      pivot: [0, -THIGH, 0],
      boxes: [box([0.065, SHIN + 0.01, 0.065], [0, -SHIN / 2, 0])],
      children: [
        {
          name: `${side}Hock`,
          pivot: [0, -SHIN, 0],
          boxes: [box([0.055, 0.1, 0.055], [0, -0.045, 0])],
          children: [{ ...paw(side), name: `${side}HindPaw`, pivot: [0, -HOCK, 0] }],
        },
      ],
    },
  ],
})

export const DOG: Joint = {
  name: 'trunk',
  pivot: [0, 0, 0],
  boxes: [
    box([0.2, 0.22, 0.4], [0, 0, 0.08]), // chest
    box([0.16, 0.17, 0.04], [0, -0.01, 0.27], 'coatDark'), // white chest
  ],
  children: [
    {
      // The back half, bending at the loin: rump, tail and hind legs.
      name: 'loin',
      pivot: LOIN,
      boxes: [box([0.18, 0.19, 0.26], [0, 0.01, -0.18 - LOIN[2]])], // loin and rump
      children: [
        {
          name: 'tail',
          pivot: [0, 0.07, -0.31 - LOIN[2]],
          boxes: [box([0.05, 0.05, 0.28], [0, 0, -0.13])],
        },
        hindLeg('left', 0.065),
        hindLeg('right', -0.065),
      ],
    },
    {
      name: 'neck',
      pivot: [0, 0.08, 0.27],
      boxes: [box([0.12, 0.2, 0.12], [0, 0.08, 0.02])],
      children: [
        {
          name: 'head',
          pivot: [0, 0.18, 0.04],
          boxes: [
            box([0.14, 0.13, 0.15], [0, 0.02, 0.03]), // skull
            box([0.08, 0.07, 0.12], [0, -0.01, 0.16], 'coatDark'), // muzzle
            box([0.04, 0.035, 0.03], [0, 0.015, 0.225], 'nose'),
            box([0.04, 0.08, 0.025], [0.05, 0.11, 0], 'nose'), // ears
            box([0.04, 0.08, 0.025], [-0.05, 0.11, 0], 'nose'),
          ],
        },
      ],
    },
    frontLeg('left', 0.065),
    frontLeg('right', -0.065),
  ],
}

export type DogPosture = 'stand' | 'sit' | 'down'

const symmetric = (legs: Record<string, number>): Pose => {
  const out: Pose = {}
  for (const [joint, angle] of Object.entries(legs)) {
    out[`left${joint}`] = angle
    out[`right${joint}`] = angle
  }
  return out
}

/**
 * Static postures. Angles are relative to the parent joint (see `rig.ts` for the signs):
 * the hind leg is a zig-zag — thigh forward, shin back, hock forward.
 */
export const DOG_POSTURES: Record<DogPosture, Pose> = {
  stand: {
    trunk: 0,
    neck: -0.5,
    head: 0.45,
    tail: -0.7,
    ...symmetric({ Shoulder: 0, Elbow: 0, Hip: -0.45, Stifle: 1.0, Hock: -0.55 }),
  },
  // Trunk up ~45°, front legs straight down, hind legs folded under with the hocks on the
  // ground; the head turned up towards the handler.
  sit: {
    trunk: -0.65,
    neck: 0.25,
    head: 0.45,
    tail: 0.4,
    ...symmetric({ Shoulder: 0.65, Elbow: 0, Hip: -0.75, Stifle: 2.65, Hock: -2.75 }),
  },
  // Sphinx: trunk level on the ground, forelegs stretched forward along it, hind legs
  // folded beside the body.
  down: {
    trunk: 0,
    neck: -0.35,
    head: 0.3,
    tail: -0.55,
    ...symmetric({ Shoulder: -1.38, Elbow: -0.2, Hip: -1.45, Stifle: 2.9, Hock: -2.95 }),
  },
}

export type DogGait = 'walk' | 'trot' | 'gallop'

/**
 * The trunk's height when the legs carry it (standing, walking, trotting): low enough for
 * a straight foreleg to reach a paw half a stride ahead or behind.
 */
export const DOG_STANDING_HEIGHT = 0.4

const PAW_X = 0.065
const FRONT_Z = 0.22
const HIND_Z = -0.23
/** Paw joint above the ground (the paw box below it). */
const PAW_HEIGHT = 0.04

/**
 * Which paws move together. The stepper counts a paw's cycle from its landing: in the walk
 * they land left hind, left front, right hind, right front, a quarter cycle apart; in the
 * trot the diagonal pairs land together. Order: left front, right front, left hind, right
 * hind.
 */
export const DOG_FEET: Record<DogGait, FootSpec[]> = {
  walk: [
    { name: 'leftFrontPaw', neutral: [PAW_X, FRONT_Z] },
    { name: 'rightFrontPaw', neutral: [-PAW_X, FRONT_Z] },
    { name: 'leftHindPaw', neutral: [PAW_X, HIND_Z] },
    { name: 'rightHindPaw', neutral: [-PAW_X, HIND_Z] },
  ],
  // Trotting, a diagonal pair moves as one.
  trot: [
    { name: 'leftFrontPaw', neutral: [PAW_X, FRONT_Z], pair: 0 },
    { name: 'rightFrontPaw', neutral: [-PAW_X, FRONT_Z], pair: 1 },
    { name: 'leftHindPaw', neutral: [PAW_X, HIND_Z], pair: 1 },
    { name: 'rightHindPaw', neutral: [-PAW_X, HIND_Z], pair: 0 },
  ],
  // Galloping each paw goes its own way through the stride (`gallop.ts`).
  gallop: [
    { name: 'leftFrontPaw', neutral: [PAW_X, FRONT_Z] },
    { name: 'rightFrontPaw', neutral: [-PAW_X, FRONT_Z] },
    { name: 'leftHindPaw', neutral: [PAW_X, HIND_Z] },
    { name: 'rightHindPaw', neutral: [-PAW_X, HIND_Z] },
  ],
}

/**
 * A border collie trots at heel with long, easy strides, about two a second. Turning, each
 * paw steps as far as its own place moves: the paws near the turn only shuffle round, the
 * others step out; a planted paw turns a little on its pads.
 */
export const dogStep = (gait: DogGait): StepGait => ({
  // (The gallop has a stride of its own, `gallop.ts`; going into and out of it, a trot.)
  ...(gait === 'walk'
    ? { stance: 0.6, cycleLength: 0.48, clearance: 0.05 }
    : { stance: 0.5, cycleLength: 0.56, clearance: 0.07 }),
  swingTime: gait === 'walk' ? 0.22 : 0.18,
  pivot: 0.3,
  // A dog's leg reaches little sideways (it swings out some 15°).
  reachAside: 0.3,
  // A trotting dog never has more than two paws in the air, a walking one mostly one.
  support: gait === 'walk' ? 3 : 2,
})

/** A dog's legs hardly turn or swing sideways: about 20°, 20° out and 17° in (under the body). */
const DOG_LIMITS: LegLimits = { yaw: 0.35, out: 0.35, in: 0.3 }

/** How the trunk is carried: its middle's height, its pitch (nose down positive), the loin's bend. */
export type Carriage = { height: number; pitch: number; flex: number }
const STANDING: Carriage = { height: DOG_STANDING_HEIGHT, pitch: 0, flex: 0 }

/**
 * The leg angles that put the paws where the stepper has them, the trunk carried as
 * `carriage` (by default level at its standing height, the back straight). Forelegs bend at
 * the elbow backwards, hind legs at the stifle forwards with the hock kept upright.
 */
export const dogLegs = (
  feet: readonly FootState[],
  body: Body,
  carriage: Carriage = STANDING,
): Pose => {
  const c = Math.cos(body.heading)
  const s = Math.sin(body.heading)
  const pose: Pose = {}
  DOG_FEET.trot.forEach((spec, i) => {
    const foot = feet[i]!
    const dx = foot.x - body.x
    const dz = foot.z - body.z
    // Into the trunk's frame (pitched), and for a hind paw on into the loin's (bent).
    const [ty, tz] = pitchPoint(
      PAW_HEIGHT + foot.lift - carriage.height,
      s * dx + c * dz,
      -carriage.pitch,
    )
    const hind = spec.name.endsWith('HindPaw')
    const [ly, lz] = hind
      ? pitchPoint(ty - LOIN[1], tz - LOIN[2], -carriage.flex)
      : [ty - LOIN[1], tz - LOIN[2]]
    const paw: Vec3 = [c * dx - s * dz, ly + LOIN[1], lz + LOIN[2]]
    const yaw = angleTo(body.heading, foot.yaw)
    const side = spec.name.startsWith('left') ? 'left' : 'right'
    const x = side === 'left' ? PAW_X : -PAW_X
    if (spec.name.endsWith('FrontPaw')) {
      const leg = limitedLeg(
        [paw[0] - x, paw[1] + 0.05, paw[2] - FRONT_Z],
        FORE_UPPER,
        FORE_LOWER,
        yaw,
        'back',
        DOG_LIMITS,
        side,
      )
      pose[`${side}Shoulder`] = leg.hip
      pose[`${side}Shoulder.yaw`] = leg.yaw
      pose[`${side}Shoulder.roll`] = leg.roll
      pose[`${side}Elbow`] = leg.knee
    } else {
      // The hock stays upright in the leg's plane, so it leans with the leg when the leg
      // swings out: the stifle and hip reach for its top, found in two passes.
      const solve = (roll: number, turn: number) => {
        const hock = [
          HOCK * Math.sin(roll) * Math.cos(turn),
          -HOCK * Math.cos(roll),
          -HOCK * Math.sin(roll) * Math.sin(turn),
        ]
        return limitedLeg(
          [paw[0] - hock[0]! - x, paw[1] - hock[1]! + 0.04, paw[2] - hock[2]! + 0.22],
          THIGH,
          SHIN,
          yaw,
          'forward',
          DOG_LIMITS,
          side,
        )
      }
      const first = solve(0, 0)
      const leg = solve(solve(first.roll, first.yaw).roll, first.yaw)
      pose[`${side}Hip`] = leg.hip
      pose[`${side}Hip.yaw`] = leg.yaw
      pose[`${side}Hip.roll`] = leg.roll
      pose[`${side}Stifle`] = leg.knee
      pose[`${side}Hock`] = -(leg.hip + leg.knee)
    }
    pose[`${spec.name}.yaw`] = yaw
  })
  return pose
}

/** Where the paws are on the ground in a pose (sitting, lying down), in DOG_FEET order. */
export const dogPawsOnGround = (pose: Pose, body: Body) => {
  const frames = jointFrames(DOG, pose)
  const c = Math.cos(body.heading)
  const s = Math.sin(body.heading)
  return DOG_FEET.trot.map((spec) => {
    const [x, , z] = frames.get(spec.name)!.position
    return { x: body.x + c * x + s * z, z: body.z - s * x + c * z, yaw: body.heading }
  })
}

import type { Box, Joint, Pose, Vec3 } from './rig'

/**
 * A medium dog (border collie size, ~53 cm at the withers) out of boxes. The root joint
 * is the centre of the trunk. Paws are marked by side — `leftMark` / `rightMark` — so the
 * plan can tell which leg moves; the handler's shoes use the same two colours.
 */

const box = (size: Vec3, at: Vec3, paint: Box['paint'] = 'coat'): Box => ({ size, at, paint })

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
      pivot: [0, -0.16, 0],
      boxes: [box([0.06, 0.17, 0.06], [0, -0.085, 0])],
      children: [{ ...paw(side), name: `${side}FrontPaw`, pivot: [0, -0.17, 0] }],
    },
  ],
})

const hindLeg = (side: 'left' | 'right', x: number): Joint => ({
  name: `${side}Hip`,
  pivot: [x, -0.04, -0.22],
  boxes: [box([0.08, 0.2, 0.11], [0, -0.07, 0])],
  children: [
    {
      name: `${side}Stifle`,
      pivot: [0, -0.15, 0],
      boxes: [box([0.065, 0.16, 0.065], [0, -0.075, 0])],
      children: [
        {
          name: `${side}Hock`,
          pivot: [0, -0.15, 0],
          boxes: [box([0.055, 0.1, 0.055], [0, -0.045, 0])],
          children: [{ ...paw(side), name: `${side}HindPaw`, pivot: [0, -0.09, 0] }],
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
    box([0.18, 0.19, 0.26], [0, 0.01, -0.18]), // loin and rump
    box([0.16, 0.17, 0.04], [0, -0.01, 0.27], 'coatDark'), // white chest
  ],
  children: [
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
    {
      name: 'tail',
      pivot: [0, 0.07, -0.31],
      boxes: [box([0.05, 0.05, 0.28], [0, 0, -0.13])],
    },
    frontLeg('left', 0.065),
    frontLeg('right', -0.065),
    hindLeg('left', 0.065),
    hindLeg('right', -0.065),
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

export type DogGait = 'walk' | 'trot'

/** Where in the cycle each leg is (0–1). Walk: four beats LH, LF, RH, RF; trot: diagonals. */
const PHASES: Record<
  DogGait,
  Record<'leftHind' | 'leftFront' | 'rightHind' | 'rightFront', number>
> = {
  walk: { leftHind: 0, leftFront: 0.25, rightHind: 0.5, rightFront: 0.75 },
  trot: { leftFront: 0, rightHind: 0, rightFront: 0.5, leftHind: 0.5 },
}

/** Cycles per second at the handler's normal and fast pace. */
export const DOG_GAIT_RATE: Record<DogGait, number> = { walk: 1.4, trot: 2.2 }

/**
 * The swing a gait adds to the standing posture at time `t` (seconds): each leg swings
 * forward and back, the lower leg folds while it is carried forward.
 */
export const dogGait = (gait: DogGait, t: number): Pose => {
  const reach = gait === 'trot' ? 0.45 : 0.32
  const lift = gait === 'trot' ? 0.9 : 0.6
  const out: Pose = {}
  for (const [leg, offset] of Object.entries(PHASES[gait])) {
    const phase = 2 * Math.PI * (t * DOG_GAIT_RATE[gait] + offset)
    // −sin: forward first; the leg travels forward (swing) while cos > 0.
    const swing = -reach * Math.sin(phase)
    const carry = lift * Math.max(0, Math.cos(phase))
    const side = leg.startsWith('left') ? 'left' : 'right'
    if (leg.endsWith('Front')) {
      out[`${side}Shoulder`] = swing
      out[`${side}Elbow`] = carry
    } else {
      out[`${side}Hip`] = swing
      out[`${side}Stifle`] = carry
      out[`${side}Hock`] = -carry * 0.6
    }
  }
  out.head = gait === 'trot' ? -0.15 : 0
  out.tail = -0.15 * Math.sin(2 * Math.PI * t * DOG_GAIT_RATE[gait] * 2)
  return out
}

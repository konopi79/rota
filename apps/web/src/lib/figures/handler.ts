import { limitedLeg, type LegLimits } from './ik'
import type { Body, FootSpec, FootState, StepGait } from './locomotion'
import { angleTo, ease } from './math'
import { pitchPoint, type Box, type Joint, type Pose, type Vec3 } from './rig'

/**
 * The handler (~1.78 m) out of boxes. The root joint is the centre of the pelvis. Feet
 * have a toe cap, so a step, a turn on the spot or a step back reads from the feet; the
 * shoes are marked by side like the dog's paws.
 */

const box = (size: Vec3, at: Vec3, paint: Box['paint']): Box => ({ size, at, paint })

const THIGH = 0.42
const SHIN = 0.4
const LEG = THIGH + SHIN
/** Sole corners relative to the ankle (y, z): where the foot touches the ground. */
export const HEEL: [number, number] = [-0.08, -0.08]
export const TOE: [number, number] = [-0.08, 0.2]
/** The hip joints, left and right, below the pelvis root. */
const HIP_X = 0.1
const HIP_DROP = 0.04

const leg = (side: 'left' | 'right', x: number): Joint => ({
  name: `${side}Hip`,
  pivot: [x, -HIP_DROP, 0],
  boxes: [box([0.15, 0.44, 0.16], [0, -0.2, 0], 'trousers')],
  children: [
    {
      name: `${side}Knee`,
      pivot: [0, -THIGH, 0],
      boxes: [box([0.12, 0.42, 0.12], [0, -0.2, 0], 'trousers')],
      children: [
        {
          name: `${side}Foot`,
          pivot: [0, -SHIN, 0],
          level: true,
          boxes: [
            box([0.11, 0.08, 0.2], [0, -0.04, 0.02], 'shoe'),
            box([0.11, 0.08, 0.08], [0, -0.04, 0.16], side === 'left' ? 'leftMark' : 'rightMark'),
          ],
        },
      ],
    },
  ],
})

const arm = (side: 'left' | 'right', x: number): Joint => ({
  name: `${side}Shoulder`,
  pivot: [x, 0.48, 0],
  boxes: [box([0.1, 0.3, 0.11], [0, -0.13, 0], 'shirt')],
  children: [
    {
      name: `${side}Elbow`,
      pivot: [0, -0.28, 0],
      boxes: [
        box([0.085, 0.26, 0.09], [0, -0.13, 0], 'skin'),
        box([0.09, 0.09, 0.07], [0, -0.3, 0], 'skin'), // hand
      ],
    },
  ],
})

export const HANDLER: Joint = {
  name: 'pelvis',
  pivot: [0, 0, 0],
  boxes: [box([0.36, 0.16, 0.22], [0, 0, 0], 'trousers')],
  children: [
    {
      name: 'spine',
      pivot: [0, 0.07, 0],
      boxes: [box([0.4, 0.52, 0.22], [0, 0.26, 0], 'shirt')],
      children: [
        {
          name: 'head',
          pivot: [0, 0.52, 0],
          boxes: [
            box([0.1, 0.06, 0.1], [0, 0.03, 0], 'skin'), // neck
            box([0.2, 0.22, 0.21], [0, 0.17, 0], 'skin'),
            box([0.04, 0.05, 0.04], [0, 0.15, 0.12], 'skin'), // nose: which way the head faces
          ],
        },
        arm('left', 0.25),
        arm('right', -0.25),
      ],
    },
    leg('left', HIP_X),
    leg('right', -HIP_X),
  ],
}

export const HANDLER_STAND: Pose = {
  spine: 0,
  head: 0.15, // looking a little down, at the dog
  leftShoulder: 0,
  rightShoulder: 0,
  leftElbow: -0.25,
  rightElbow: -0.25,
}

export type HandlerPace = 'slow' | 'normal' | 'fast'

type Pace = {
  /** How much further back the feet land walking than standing, metres. */
  backShift: number
  /** Step cycles per second at full speed. */
  rate: number
  /** Metres walked per step cycle. */
  cycleLength: number
  /** Share of the cycle a foot is on the ground. */
  stance: number
  /** Toes up as the heel lands (negative) and down as the foot pushes off, radians. */
  strike: number
  pushOff: number
  /** How high a full step lifts the heel, metres. */
  clearance: number
  /** How far the arms swing forward and back, radians. */
  arms: number
}

const PACES: Record<HandlerPace, Pace> = {
  slow: {
    backShift: 0.05,
    rate: 0.6,
    cycleLength: 0.8,
    stance: 0.65,
    strike: -0.2,
    pushOff: 0.4,
    clearance: 0.1,
    arms: 0.24,
  },
  normal: {
    backShift: 0.11,
    rate: 0.95,
    cycleLength: 1.2,
    stance: 0.6,
    strike: -0.3,
    pushOff: 0.55,
    clearance: 0.12,
    arms: 0.34,
  },
  fast: {
    backShift: 0.14,
    rate: 1.3,
    cycleLength: 1.53,
    stance: 0.55,
    strike: -0.35,
    pushOff: 0.7,
    clearance: 0.15,
    arms: 0.48,
  },
}

/** Walking speed in m/s and step cycles per second for each pace. */
export const HANDLER_PACE: Record<HandlerPace, { speed: number; rate: number }> = {
  slow: { speed: PACES.slow.rate * PACES.slow.cycleLength, rate: PACES.slow.rate },
  normal: { speed: PACES.normal.rate * PACES.normal.cycleLength, rate: PACES.normal.rate },
  fast: { speed: PACES.fast.rate * PACES.fast.cycleLength, rate: PACES.fast.rate },
}

/**
 * The stepper tracks each foot by its heel's point on the ground. Turning on the spot, a
 * foot can carry about 70° of the turn between two steps — the leg turns some 35° either
 * way at the hip — so a 270° turn takes four or five steps.
 */
export const HANDLER_FEET: FootSpec[] = [
  { name: 'leftFoot', neutral: [HIP_X, HEEL[1]], offset: 0 },
  { name: 'rightFoot', neutral: [-HIP_X, HEEL[1]], offset: 0.5 },
]

export const handlerStep = (pace: HandlerPace): StepGait => ({
  stance: PACES[pace].stance,
  cycleLength: PACES[pace].cycleLength,
  clearance: PACES[pace].clearance,
  turnLength: 0.65,
  sideways: 2,
  backShift: PACES[pace].backShift,
  support: 1,
  // A person's leg hardly reaches across under the body (the hip turns 15° inwards).
  reachAside: 0.35,
})

/** A human hip: turns the leg about 40° either way, swings it 25° out and 20° in. */
const HIP_LIMITS: LegLimits = { yaw: 0.7, out: 0.45, in: 0.35 }

/** The longest a walking leg stretches: nearly straight, never locked. */
const WALKING_LEG = LEG * 0.996
/** The pelvis root standing straight: ankle height + leg + hip joint. */
const STANDING = 0.08 + WALKING_LEG + HIP_DROP

/**
 * The legs, feet and arms that put the feet where the stepper has them. The feet roll
 * like real ones in proportion to the step: on the heel with the toes up as they land,
 * flat, then over the toes as they push off; short steps (turning on the spot) hardly
 * roll. The pelvis is as high as both legs still reach their ankles, so it rises over the
 * planted leg and dips while both feet are down.
 */
export const handlerPose = (
  feet: readonly FootState[],
  body: Body,
  pace: HandlerPace,
  cycle: number,
  motion: number,
): Pose => {
  const p = PACES[pace]
  const ankles = feet.map((foot) => {
    const k = Math.min(1, foot.step / (p.cycleLength * p.stance))
    let pitch = 0
    if (foot.swing === null) {
      const q = foot.stance
      if (q < 0.15) pitch = p.strike * k * (1 - ease(q / 0.15))
      else if (q > 0.55) pitch = p.pushOff * k * ease((q - 0.55) / 0.45)
    } else {
      const u = foot.swing
      if (u < 0.35) pitch = p.pushOff * k * (1 - ease(u / 0.35))
      else if (u > 0.7) pitch = p.strike * k * ease((u - 0.7) / 0.3)
    }
    // From the point carrying the weight back to the ankle: the toes while the foot is
    // tipped forward (pushing off, just lifted), otherwise the heel.
    const onToes = pitch > 0
    const fx = Math.sin(foot.yaw)
    const fz = Math.cos(foot.yaw)
    const reach = TOE[1] - HEEL[1]
    const [py, pz] = onToes
      ? pitchPoint(TOE[0], TOE[1], pitch)
      : pitchPoint(HEEL[0], HEEL[1], pitch)
    const cx = foot.x + (onToes ? fx * reach : 0)
    const cz = foot.z + (onToes ? fz * reach : 0)
    const wx = cx - fx * pz
    const wz = cz - fz * pz
    // Into the body's frame.
    const dx = wx - body.x
    const dz = wz - body.z
    const c = Math.cos(body.heading)
    const s = Math.sin(body.heading)
    return {
      x: c * dx - s * dz,
      y: foot.lift - py,
      z: s * dx + c * dz,
      pitch,
      yaw: angleTo(body.heading, foot.yaw),
    }
  })

  const hipX = [HIP_X, -HIP_X]
  const pelvis = Math.min(
    STANDING,
    ...ankles.map((a, i) => {
      const flat = Math.hypot(a.x - hipX[i]!, a.z)
      return a.y + Math.sqrt(Math.max(0, WALKING_LEG ** 2 - flat ** 2)) + HIP_DROP
    }),
  )

  const pose: Pose = {
    ...HANDLER_STAND,
    spine: (pace === 'fast' ? 0.12 : 0.03) * motion,
  }
  ;(['left', 'right'] as const).forEach((side, i) => {
    const a = ankles[i]!
    const target: Vec3 = [a.x - hipX[i]!, a.y - (pelvis - HIP_DROP), a.z]
    const legAngles = limitedLeg(target, THIGH, SHIN, a.yaw, 'forward', HIP_LIMITS, side)
    pose[`${side}Hip`] = legAngles.hip
    pose[`${side}Hip.yaw`] = legAngles.yaw
    pose[`${side}Hip.roll`] = legAngles.roll
    pose[`${side}Knee`] = legAngles.knee
    pose[`${side}Foot`] = a.pitch
    pose[`${side}Foot.yaw`] = a.yaw
    // Arms swing against the leg of the same side: furthest back as its heel lands.
    const offset = side === 'left' ? 0 : 0.5
    pose[`${side}Shoulder`] = p.arms * motion * Math.cos(2 * Math.PI * (cycle + offset))
    pose[`${side}Elbow`] = -0.25 - (pace === 'fast' ? 1.2 : 0.1) * motion
  })
  return pose
}

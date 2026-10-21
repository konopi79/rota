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
            box([0.035, 0.03, 0.01], [0.05, 0.195, 0.108], 'eye'),
            box([0.035, 0.03, 0.01], [-0.05, 0.195, 0.108], 'eye'),
            // Short hair: on top with a fringe, at the back and over the ears.
            box([0.22, 0.05, 0.23], [0, 0.29, -0.005], 'hair'),
            box([0.2, 0.03, 0.02], [0, 0.255, 0.106], 'hair'),
            box([0.22, 0.15, 0.03], [0, 0.215, -0.11], 'hair'),
            box([0.02, 0.09, 0.12], [0.105, 0.235, -0.045], 'hair'),
            box([0.02, 0.09, 0.12], [-0.105, 0.235, -0.045], 'hair'),
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

/** The stepper tracks each foot by its heel's point on the ground. */
export const HANDLER_FEET: FootSpec[] = [
  { name: 'leftFoot', neutral: [HIP_X, HEEL[1]] },
  { name: 'rightFoot', neutral: [-HIP_X, HEEL[1]] },
]

/**
 * A step in the air takes as long as at the pace's cadence: a stride cycle is two steps,
 * each foot in the air for the share of it it is not down.
 */
export const handlerStep = (pace: HandlerPace): StepGait => ({
  stance: PACES[pace].stance,
  cycleLength: PACES[pace].cycleLength,
  clearance: PACES[pace].clearance,
  swingTime: (1 - PACES[pace].stance) / PACES[pace].rate,
  doubleSupport: 0.08,
  backShift: PACES[pace].backShift,
  // Turning on the spot, a person sets the stepping foot well into the new direction and
  // turns a little on the planted heel (řád p. 9: a 90° turn is one such step).
  pivot: 0.5,
})

/** A human hip: turns the leg about 40° either way, swings it 25° out and 20° in. */
const HIP_LIMITS: LegLimits = { yaw: 0.69, out: 0.45, in: 0.35 }

/** The longest a walking leg stretches: nearly straight, never locked. */
const WALKING_LEG = LEG * 0.996
/** The pelvis root standing straight: ankle height + leg + hip joint. */
const STANDING = 0.08 + WALKING_LEG + HIP_DROP
/**
 * Walking, a person keeps the knees a little soft and the pelvis this much lower than
 * standing (metres, at full pace): it then rides level over the planted leg and dips only
 * as far as the spread feet need, instead of bobbing up to full height every step.
 */
const WALK_SINK = 0.012

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
  /** Each foot's pitch last frame and how far it may change by now: feet never snap. */
  previous?: { pitch: readonly number[]; maxChange: number; pelvis: number; maxRise: number },
): Pose => {
  const p = PACES[pace]
  const ankles = feet.map((foot, i) => {
    // A short step lands flatter than a full one…
    const k = Math.min(1, foot.step / (p.cycleLength * p.stance))
    // …and a foot pushes off as far as it is left behind the body, however long the step
    // that put it there (the half step setting off is followed by a full push-off).
    const behind =
      -((foot.x - body.x) * Math.sin(body.heading) + (foot.z - body.z) * Math.cos(body.heading)) +
      HEEL[1]
    const push = Math.min(1, Math.max(0, behind) / (p.cycleLength * p.stance * 0.5))
    let pitch = 0
    if (foot.swing === null) {
      // On the ground the foot rolls only while the body moves over it: standing, it is flat.
      const rolling = Math.min(1, 2 * motion)
      const q = foot.stance
      if (q < 0.15) pitch = p.strike * k * rolling * (1 - ease(q / 0.15))
      else if (q > 0.55) pitch = p.pushOff * push * rolling * ease((q - 0.55) / 0.45)
    } else {
      const u = foot.swing
      if (u < 0.35) pitch = p.pushOff * push * (1 - ease(u / 0.35))
      else if (u > 0.7) pitch = p.strike * k * ease((u - 0.7) / 0.3)
    }
    if (previous) {
      const before = previous.pitch[i] ?? 0
      pitch = before + Math.max(-previous.maxChange, Math.min(previous.maxChange, pitch - before))
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
  // As high as both legs reach — and rising no faster than a person rises off the back
  // foot: it drops when it must, but never pops up as a foot lifts.
  const pelvis = Math.min(
    STANDING - WALK_SINK * motion,
    previous ? previous.pelvis + previous.maxRise : Infinity,
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
    // Arms swing against the legs: the arm is back as far as its leg is ahead of the other.
    const apart = (ankles[i]!.z - ankles[1 - i]!.z) / (p.cycleLength * p.stance)
    pose[`${side}Shoulder`] = p.arms * Math.max(-1.2, Math.min(1.2, apart))
    pose[`${side}Elbow`] = -0.25 - (pace === 'fast' ? 1.2 : 0.1) * motion
  })
  return pose
}

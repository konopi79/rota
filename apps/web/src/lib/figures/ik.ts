import type { V3 } from './math'

/**
 * Angles for a two-segment leg hanging from its hip so that its end reaches `target`
 * (relative to the hip, in the frame of the body the hip sits on). The leg first turns
 * (`yaw`) to face where the foot points, swings out sideways (`roll`) towards the target,
 * then bends in its own plane. A knee bends `forward` (human knee, dog's stifle) or `back`
 * (dog's elbow). Out of reach, the leg stretches as far as it goes.
 */
export type LegLimits = {
  /** How far the leg turns about the vertical, radians either way. */
  yaw: number
  /** How far it swings out and in, radians (outwards positive). */
  out: number
  in: number
}

const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x))

/**
 * As `twoBoneLeg`, within what the joint can do: the turn and the sideways swing are
 * clamped (`side` says which way is out). A target past the limits is reached as nearly as
 * the joint allows — keeping the feet where a real leg can put them is the stepper's job.
 */
export const limitedLeg = (
  target: V3,
  upper: number,
  lower: number,
  yaw: number,
  knee: 'forward' | 'back',
  limits: LegLimits,
  side: 'left' | 'right',
) => {
  const turned = clamp(yaw, -limits.yaw, limits.yaw)
  const leg = twoBoneLeg(target, upper, lower, turned, knee)
  const [min, max] = side === 'left' ? [-limits.in, limits.out] : [-limits.out, limits.in]
  return { ...leg, roll: clamp(leg.roll, min, max) }
}

export const twoBoneLeg = (
  target: V3,
  upper: number,
  lower: number,
  yaw: number,
  knee: 'forward' | 'back',
) => {
  // Into the leg's turned frame (undo the yaw: rotate by −yaw about y).
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const x1 = c * target[0] - s * target[2]
  const y1 = target[1]
  const z1 = s * target[0] + c * target[2]
  // Swing out sideways until the target lies in the leg's plane.
  const roll = Math.atan2(x1, -y1)
  const y2 = Math.hypot(x1, y1) * Math.sign(y1 || -1)
  const z2 = z1
  // Bend in the plane.
  const reach = Math.min(
    Math.max(Math.hypot(y2, z2), Math.abs(upper - lower) + 1e-4),
    (upper + lower) * 0.9999,
  )
  const towards = Math.atan2(-z2, -y2) // from straight down, positive = back
  const thigh = Math.acos((upper ** 2 + reach ** 2 - lower ** 2) / (2 * upper * reach))
  const bend = Math.PI - Math.acos((upper ** 2 + lower ** 2 - reach ** 2) / (2 * upper * lower))
  return knee === 'forward'
    ? { yaw, roll, hip: towards - thigh, knee: bend }
    : { yaw, roll, hip: towards + thigh, knee: -bend }
}

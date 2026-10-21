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

const leg = (side: 'left' | 'right', x: number): Joint => ({
  name: `${side}Hip`,
  pivot: [x, -0.04, 0],
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
    leg('left', 0.1),
    leg('right', -0.1),
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

type Gait = {
  /** Step cycles per second. */
  rate: number
  /** Share of the cycle a foot is on the ground. */
  stance: number
  /** How far a planted foot travels back under the hips, metres. */
  stride: number
  /** The heel lands this far ahead of the hip. */
  reach: number
  /** Share of the stance after which the heel lifts and the foot rolls over the toes. */
  heelOff: number
  /** Toes up as the heel lands (negative) and down as the foot pushes off, radians. */
  strike: number
  pushOff: number
  /** How much higher than the straight line between steps the ankle is carried. */
  clearance: number
}

export const HANDLER_GAITS: Record<HandlerPace, Gait> = {
  slow: {
    rate: 0.6,
    stance: 0.65,
    stride: 0.46,
    reach: 0.2,
    heelOff: 0.6,
    strike: -0.2,
    pushOff: 0.4,
    clearance: 0.05,
  },
  normal: {
    rate: 0.95,
    stance: 0.6,
    stride: 0.62,
    reach: 0.26,
    heelOff: 0.55,
    strike: -0.3,
    pushOff: 0.55,
    clearance: 0.07,
  },
  fast: {
    rate: 1.3,
    stance: 0.55,
    stride: 0.8,
    reach: 0.32,
    heelOff: 0.5,
    strike: -0.35,
    pushOff: 0.7,
    clearance: 0.1,
  },
}

/** 0 → 1 with zero slope at both ends. */
const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/**
 * The ankle at `p` (0–1) of a step cycle — height above the ground (y) and distance ahead
 * of the hip (z) — and the foot's pitch (positive = toes down).
 *
 * On the ground the foot rolls like a real one: it lands on the heel with the toes up,
 * lowers the sole, then lifts the heel and pushes off over the toes. Whichever point
 * carries the weight — heel, then toes — moves back at exactly the walking speed, so it
 * stays put on the ground. In the air the ankle swings forward in an arc while the foot
 * turns from toes-down to toes-up for the next landing.
 */
export const handlerFoot = (pace: HandlerPace, p: number) => {
  const g = HANDLER_GAITS[pace]
  const stanceAt = (q: number) => {
    const heelZ = g.reach - g.stride * q
    let pitch = 0
    let contact = HEEL
    let contactZ = heelZ
    if (q < 0.15) pitch = g.strike * (1 - ease(q / 0.15))
    else if (q > g.heelOff) {
      pitch = g.pushOff * ease((q - g.heelOff) / (1 - g.heelOff))
      contact = TOE
      contactZ = heelZ + (TOE[1] - HEEL[1])
    }
    const [cy, cz] = pitchPoint(contact[0], contact[1], pitch)
    return { y: -cy, z: contactZ - cz, pitch }
  }
  if (p < g.stance) return stanceAt(p / g.stance)
  const u = (p - g.stance) / (1 - g.stance)
  const from = stanceAt(1)
  const to = stanceAt(0)
  const pitch =
    u < 0.35 ? from.pitch * (1 - ease(u / 0.35)) : u > 0.7 ? to.pitch * ease((u - 0.7) / 0.3) : 0
  return {
    y: from.y + (to.y - from.y) * u + g.clearance * Math.sin(Math.PI * u),
    z: from.z + (to.z - from.z) * ease(u),
    pitch,
  }
}

/**
 * Most a walking leg is stretched: nearly straight, but never locked — so the hips rise
 * over the planted foot and dip while both feet are on the ground, as in real walking.
 */
const WALKING_LEG = LEG * 0.985

/** Hip and knee angles that put the ankle at (y, z) from the hip joint; the knee bends forward. */
const legAngles = (y: number, z: number) => {
  const d = Math.min(Math.hypot(y, z), LEG * 0.9999)
  const towards = Math.atan2(-z, -y) // from straight down, positive = back
  const thigh = Math.acos((THIGH ** 2 + d ** 2 - SHIN ** 2) / (2 * THIGH * d))
  const knee = Math.acos((THIGH ** 2 + SHIN ** 2 - d ** 2) / (2 * THIGH * SHIN))
  return { hip: towards - thigh, knee: Math.PI - knee }
}

const paceOf = (g: Gait) => ({ speed: (g.stride * g.rate) / g.stance, rate: g.rate })

/** Walking speed in m/s — how fast a planted foot moves back; the ground slides at it. */
export const HANDLER_PACE: Record<HandlerPace, { speed: number; rate: number }> = {
  slow: paceOf(HANDLER_GAITS.slow),
  normal: paceOf(HANDLER_GAITS.normal),
  fast: paceOf(HANDLER_GAITS.fast),
}

/** The pose walking sets on top of the standing pose at time `t` (seconds). */
export const handlerGait = (pace: HandlerPace, t: number): Pose => {
  const { rate } = HANDLER_GAITS[pace]
  const out: Pose = { spine: pace === 'fast' ? 0.12 : 0.03 }
  const feet = (
    [
      ['left', 0],
      ['right', 0.5],
    ] as const
  ).map(([side, offset]) => ({ side, ...handlerFoot(pace, (((t * rate + offset) % 1) + 1) % 1) }))
  // The hips as high as both legs still reach their ankles.
  const hips = Math.min(...feet.map((f) => f.y + Math.sqrt(WALKING_LEG ** 2 - f.z ** 2)))
  for (const { side, ...foot } of feet) {
    const { hip, knee } = legAngles(foot.y - hips, foot.z)
    out[`${side}Hip`] = hip
    out[`${side}Knee`] = knee
    out[`${side}Foot`] = foot.pitch
    // Arms swing against the leg of the same side.
    out[`${side}Shoulder`] = -0.8 * hip
    out[`${side}Elbow`] = pace === 'fast' ? -1.2 : -0.1
  }
  return out
}

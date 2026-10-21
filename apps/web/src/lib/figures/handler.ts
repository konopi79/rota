import type { Box, Joint, Pose, Vec3 } from './rig'

/**
 * The handler (~1.78 m) out of boxes. The root joint is the centre of the pelvis. Feet
 * stay level and have a toe cap, so a step, a turn on the spot or a step back reads from
 * the feet; the shoes are marked by side like the dog's paws.
 */

const box = (size: Vec3, at: Vec3, paint: Box['paint']): Box => ({ size, at, paint })

const leg = (side: 'left' | 'right', x: number): Joint => ({
  name: `${side}Hip`,
  pivot: [x, -0.04, 0],
  boxes: [box([0.15, 0.44, 0.16], [0, -0.2, 0], 'trousers')],
  children: [
    {
      name: `${side}Knee`,
      pivot: [0, -0.42, 0],
      boxes: [box([0.12, 0.42, 0.12], [0, -0.2, 0], 'trousers')],
      children: [
        {
          name: `${side}Foot`,
          pivot: [0, -0.4, 0],
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

/** Hip joint to ankle: the radius the foot on the ground swings about. */
const LEG = 0.82

type Gait = {
  /** Step cycles per second. */
  rate: number
  /** The thigh swings from −reach (forward) to +reach (back), radians. */
  reach: number
  /** Share of the cycle a foot is on the ground. */
  stance: number
  /** Knee bend at mid-swing, radians — how high the foot is carried. */
  knee: number
}

const GAITS: Record<HandlerPace, Gait> = {
  slow: { rate: 0.6, reach: 0.3, stance: 0.6, knee: 0.75 },
  normal: { rate: 0.95, reach: 0.42, stance: 0.55, knee: 0.95 },
  fast: { rate: 1.4, reach: 0.55, stance: 0.5, knee: 1.15 },
}

/**
 * Walking speed in m/s: how fast the foot on the ground moves back. The ground slides at
 * this speed, so the planted foot stays put on it instead of shuffling.
 */
const speedOf = ({ rate, reach, stance }: Gait) => (2 * LEG * Math.sin(reach) * rate) / stance

export const HANDLER_PACE: Record<HandlerPace, { speed: number; rate: number }> = {
  slow: { speed: speedOf(GAITS.slow), rate: GAITS.slow.rate },
  normal: { speed: speedOf(GAITS.normal), rate: GAITS.normal.rate },
  fast: { speed: speedOf(GAITS.fast), rate: GAITS.fast.rate },
}

/**
 * The swing walking adds to the standing pose at time `t` (seconds). Each leg is planted
 * and straight for the stance — the thigh sweeps back at an even speed, so the foot keeps
 * pace with the ground — then lifted: the knee bends and the thigh swings forward again.
 */
export const handlerGait = (pace: HandlerPace, t: number): Pose => {
  const { rate, reach, stance, knee } = GAITS[pace]
  const out: Pose = { spine: pace === 'fast' ? 0.15 : 0.03 }
  for (const [side, offset] of [
    ['left', 0],
    ['right', 0.5],
  ] as const) {
    const p = (((t * rate + offset) % 1) + 1) % 1
    let hip: number
    if (p < stance) {
      hip = -reach + (2 * reach * p) / stance
      out[`${side}Knee`] = 0
    } else {
      const u = (p - stance) / (1 - stance)
      hip = reach * Math.cos(Math.PI * u)
      out[`${side}Knee`] = knee * Math.sin(Math.PI * u)
    }
    out[`${side}Hip`] = hip
    // Arms swing against the leg of the same side.
    out[`${side}Shoulder`] = -0.8 * hip
    out[`${side}Elbow`] = pace === 'fast' ? -1.2 : -0.1
  }
  return out
}

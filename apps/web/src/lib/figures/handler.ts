import { limitedLeg, type LegLimits } from './ik'
import type { Body, FootSpec, FootState, StepGait } from './locomotion'
import { angleTo, ease } from './math'
import { jointFrames, pitchPoint, type Box, type Joint, type Pose, type Vec3 } from './rig'

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

/**
 * How a pace looks. Changing pace, the team blends from one to the next over about a second
 * (`blendPaceStyle`), so arms, lean and stride change smoothly, never at once.
 */
export type PaceStyle = {
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
  /**
   * How much lower than standing the pelvis rides at full pace, metres: the knees a little
   * soft walking, well bent running.
   */
  sink: number
  /** How far the trunk leans forward at full pace, radians. */
  lean: number
  /** How much more the elbows bend at full pace, radians (a runner's arms). */
  elbows: number
  /** 1 for a run — between steps both feet are in the air — 0 for a walk. */
  run: number
}

const PACES: Record<HandlerPace, PaceStyle> = {
  slow: {
    backShift: 0.05,
    rate: 0.6,
    cycleLength: 0.8,
    stance: 0.65,
    strike: -0.2,
    pushOff: 0.4,
    clearance: 0.1,
    arms: 0.24,
    sink: 0.012,
    lean: 0.03,
    elbows: 0.1,
    run: 0,
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
    sink: 0.012,
    lean: 0.03,
    elbows: 0.1,
    run: 0,
  },
  // Rychlé tempo is a jog (the video): about 170 steps a minute, a foot down a third of the
  // time, landing flatter than walking.
  fast: {
    // A runner lands under the body, not ahead of it.
    backShift: 0,
    rate: 1.4,
    cycleLength: 1.5,
    stance: 0.37,
    strike: -0.15,
    pushOff: 0.6,
    clearance: 0.25,
    arms: 0.4,
    sink: 0.03,
    lean: 0.12,
    elbows: 1.2,
    run: 1,
  },
}

/** How a pace looks. */
export const paceStyle = (pace: HandlerPace): PaceStyle => PACES[pace]

/** `from` moved `k` (0–1) of the way to `to`, every measure alike. */
export const blendPaceStyle = (from: PaceStyle, to: PaceStyle, k: number): PaceStyle =>
  Object.fromEntries(
    (Object.keys(from) as (keyof PaceStyle)[]).map((key) => [
      key,
      from[key] + (to[key] - from[key]) * k,
    ]),
  ) as PaceStyle

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
  run: PACES[pace].run ? { stanceTime: PACES[pace].stance / PACES[pace].rate } : undefined,
  backShift: PACES[pace].backShift,
  // Turning on the spot, a person sets the stepping foot well into the new direction and
  // turns a little on the planted heel (řád p. 9: a 90° turn is one such step).
  pivot: 0.5,
})

/**
 * Above this share of its full speed the fast pace is a run; below it — setting off,
 * stopping — the handler walks.
 */
export const RUNNING_MOTION = 0.65
/**
 * Running, how far above the landing leg's reach the pelvis may still be at the last part of
 * a step in the air (metres per remaining step): it settles onto that leg as the foot comes down.
 */
const LANDING_SETTLE = 0.3
/** A relaxed foot in the air points a little down from square to the shin, radians. */
const RELAXED_ANKLE = 0.15
/** How far a runner's pelvis sinks halfway through a step on the ground, metres. */
const RUN_BOUNCE = 0.04

/** A human hip: turns the leg about 40° either way, swings it 25° out and 20° in. */
const HIP_LIMITS: LegLimits = { yaw: 0.69, out: 0.45, in: 0.35 }

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
  p: PaceStyle,
  cycle: number,
  motion: number,
  /** Each foot's pitch last frame and how far it may change by now: feet never snap. */
  previous?: { pitch: readonly number[]; maxChange: number; pelvis: number; maxRise: number },
): { pose: Pose; pelvis: number; pitch: number[] } => {
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
  // A runner sinks onto the landing leg and springs off it: lowest halfway through its
  // stance, highest between steps.
  const bounce =
    RUN_BOUNCE *
    p.run *
    motion *
    Math.max(
      0,
      ...feet.map((f) => (f.swing === null ? Math.sin(Math.PI * Math.min(1, f.stance)) ** 2 : 0)),
    )
  // As high as both legs reach — and rising no faster than a person rises off the back
  // foot: it drops when it must, but never pops up as a foot lifts.
  const pelvis = Math.min(
    // How low the pace carries it changes smoothly (only the legs' reach drops it at once).
    Math.max(
      STANDING - p.sink * motion - bounce,
      previous ? previous.pelvis - previous.maxRise / 4 : 0,
    ),
    previous ? previous.pelvis + previous.maxRise : Infinity,
    ...ankles.map((a, i) => {
      const flat = Math.hypot(a.x - hipX[i]!, a.z)
      const reach = a.y + Math.sqrt(Math.max(0, WALKING_LEG ** 2 - flat ** 2)) + HIP_DROP
      // Running, a foot in the air does not hold the pelvis down: the knee folds instead —
      // eased in with the run, and out again as the foot comes down, so the body is already
      // settling onto the landing leg when it touches (the pelvis never drops at once).
      const swing = feet[i]!.swing
      if (swing === null) return reach
      const running = Math.min(1, Math.max(0, (p.run * motion - 0.45) / 0.3))
      const free = Math.min(0.5 * Math.sin(Math.PI * swing), LANDING_SETTLE * (1 - swing))
      return reach + running * free
    }),
  )

  const pose: Pose = {
    ...HANDLER_STAND,
    spine: p.lean * motion,
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
    // A runner slowing down keeps the arms bent until nearly walking.
    pose[`${side}Elbow`] = -0.25 - p.elbows * Math.min(1, 2 * motion)
  })
  // A foot in the air hangs at about a right angle to the shin: kicked up behind, it points
  // down rather than along the ground (an ankle bends up 20° at most). Blended in over the
  // step, so it leaves the ground and lands as scheduled above.
  if (feet.some((f) => f.swing !== null)) {
    const frames = jointFrames(HANDLER, pose)
    ;(['left', 'right'] as const).forEach((side, i) => {
      const swing = feet[i]!.swing
      if (swing === null) return
      const knee = frames.get(`${side}Knee`)!.position
      const ankle = frames.get(`${side}Foot`)!.position
      // The shin's lean from upright, positive with the ankle ahead of the knee.
      const lean = Math.atan2(ankle[2] - knee[2], knee[1] - ankle[1])
      const square = RELAXED_ANKLE - lean
      const scheduled = ankles[i]!.pitch
      const wanted = scheduled + (square - scheduled) * Math.sin(Math.PI * swing)
      // …but never with the toes through the ground: low over it, the foot stays flatter.
      const height = pelvis + ankle[1]
      const toesUp = (pitch: number) => height + pitchPoint(TOE[0], TOE[1], pitch)[0] >= 0.01
      let [safe, tried] = [scheduled, wanted]
      if (!toesUp(tried))
        for (let n = 0; n < 12; n++) {
          const mid = (safe + tried) / 2
          if (toesUp(mid)) safe = mid
          else tried = mid
        }
      pose[`${side}Foot`] = toesUp(wanted) ? wanted : safe
    })
  }
  // The pitches as scheduled (what the next frame changes smoothly from).
  return { pose, pelvis, pitch: ankles.map((a) => a.pitch) }
}

import {
  DOG_CYCLE_LENGTH,
  DOG_GAIT_SPEED,
  DOG_POSTURES,
  dogGait,
  type DogGait,
  type DogPosture,
} from './dog'
import { HANDLER_PACE, HANDLER_STAND, handlerGait, type HandlerPace } from './handler'
import { addPoses, blendPoses, type Pose } from './rig'

/** What the two figures are asked to do. */
export type TeamControls = {
  dog: DogPosture | DogGait
  /** Where the dog is relative to the handler. */
  place: 'left' | 'right' | 'front'
  handler: 'stand' | HandlerPace
  /** The team stays where it is while the handler walks (around the dog, on the spot). */
  stay?: boolean
  /** The dog's own speed along the way it faces, m/s, negative backing up. */
  dogSpeed?: number
}

export type FigureFrame = {
  pose: Pose
  /** Position on the ground (x, z) and heading about y; 0 = facing +z. */
  x: number
  z: number
  heading: number
}

export type TeamFrame = {
  dog: FigureFrame
  handler: FigureFrame
  /** Metres the team has walked forward so far. */
  travelled: number
  /** Metres the handler has walked so far, the team's way or not. */
  walked: number
  /** Current walking speed, m/s. */
  speed: number
}

/**
 * Dog positions around the handler, who stands at the origin facing +z (+x is the
 * handler's left). At heel the dog's shoulder blade is level with the handler's leg
 * ("lopatka psa je na úrovni nohy psovoda", regulation, appendix 1, p. 18).
 */
const PLACES: Record<TeamControls['place'], { x: number; z: number; heading: number }> = {
  left: { x: 0.42, z: -0.2, heading: 0 },
  right: { x: -0.42, z: -0.2, heading: 0 },
  front: { x: 0, z: 0.6, heading: Math.PI },
}

/** How fast a change settles: the gap shrinks by e every 1/RATE seconds. */
export const SETTLE_RATE = 5

const approach = (from: number, to: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-SETTLE_RATE * dt))

const isGait = (dog: TeamControls['dog']): dog is DogGait => dog === 'walk' || dog === 'trot'

/**
 * Keeps the figures' state between frames and eases every change: postures blend, a gait
 * fades in and out, the dog walks over to its new place, the team speeds up and slows
 * down. The step cycles advance with the distance walked, so the feet keep pace with the
 * ground while speeding up and slowing down too.
 */
export class TeamAnimator {
  private travelled = 0
  private walked = 0
  private handlerPhase = 0
  private dogPhase = 0
  private dogPosture: Pose = DOG_POSTURES.stand
  private dogGaitWeight = 0
  private lastGait: DogGait = 'walk'
  private handlerGaitWeight = 0
  private lastPace: HandlerPace = 'normal'
  private speed = 0
  private place = { ...PLACES.left }

  step(dt: number, controls: TeamControls): TeamFrame {
    const dogGaitOn = isGait(controls.dog)
    if (dogGaitOn) this.lastGait = controls.dog as DogGait
    const posture = DOG_POSTURES[dogGaitOn ? 'stand' : (controls.dog as DogPosture)]
    this.dogPosture = blendPoses(this.dogPosture, posture, 1 - Math.exp(-SETTLE_RATE * dt))
    this.dogGaitWeight = approach(this.dogGaitWeight, dogGaitOn ? 1 : 0, dt)

    const walking = controls.handler !== 'stand'
    if (walking) this.lastPace = controls.handler as HandlerPace
    this.handlerGaitWeight = approach(this.handlerGaitWeight, walking ? 1 : 0, dt)
    const pace = HANDLER_PACE[this.lastPace]
    this.speed = approach(this.speed, walking ? pace.speed : 0, dt)
    this.walked += this.speed * dt
    if (!controls.stay) this.travelled += this.speed * dt
    this.handlerPhase += (this.speed * dt) / (pace.speed / pace.rate)
    // The dog's legs follow its own motion when the caller knows it (turns: faster outside,
    // backing up inside); otherwise the handler's, or its own speed beside a standing handler.
    const dogSpeed =
      controls.dogSpeed ??
      (this.speed > 0.01 ? this.speed : dogGaitOn ? DOG_GAIT_SPEED[this.lastGait] : 0)
    this.dogPhase += (dogSpeed * dt) / DOG_CYCLE_LENGTH[this.lastGait]

    const target = PLACES[controls.place]
    this.place = {
      x: approach(this.place.x, target.x, dt),
      z: approach(this.place.z, target.z, dt),
      heading: approach(this.place.heading, target.heading, dt),
    }

    return {
      dog: {
        pose: addPoses(
          this.dogPosture,
          scalePose(dogGait(this.lastGait, this.dogPhase), this.dogGaitWeight),
        ),
        ...this.place,
      },
      handler: {
        pose: addPoses(
          HANDLER_STAND,
          scalePose(handlerGait(this.lastPace, this.handlerPhase), this.handlerGaitWeight),
        ),
        x: 0,
        z: 0,
        heading: 0,
      },
      travelled: this.travelled,
      walked: this.walked,
      speed: this.speed,
    }
  }
}

const scalePose = (pose: Pose, k: number): Pose =>
  Object.fromEntries(Object.entries(pose).map(([name, angle]) => [name, angle * k]))

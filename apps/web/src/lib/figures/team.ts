import { DOG_POSTURES, dogGait, type DogGait, type DogPosture } from './dog'
import { HANDLER_PACE, HANDLER_STAND, handlerGait, type HandlerPace } from './handler'
import { addPoses, blendPoses, type Pose } from './rig'

/** What the lab page asks the two figures to do. */
export type TeamControls = {
  dog: DogPosture | DogGait
  /** Where the dog is relative to the handler. */
  place: 'left' | 'right' | 'front'
  handler: 'stand' | HandlerPace
}

export type FigureFrame = {
  pose: Pose
  /** Position on the ground (x, z) and heading about y; 0 = facing +z. */
  x: number
  z: number
  heading: number
}

export type TeamFrame = { dog: FigureFrame; handler: FigureFrame; groundOffset: number }

/**
 * Dog positions around the handler, who stands at the origin facing +z (+x is the
 * handler's left). At heel the dog's shoulder is level with the handler's leg.
 */
const PLACES: Record<TeamControls['place'], { x: number; z: number; heading: number }> = {
  left: { x: 0.42, z: -0.12, heading: 0 },
  right: { x: -0.42, z: -0.12, heading: 0 },
  front: { x: 0, z: 0.6, heading: Math.PI },
}

/** How fast a change settles: the gap shrinks by e every 1/RATE seconds. */
const SETTLE_RATE = 5

const approach = (from: number, to: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-SETTLE_RATE * dt))

const isGait = (dog: TeamControls['dog']): dog is DogGait => dog === 'walk' || dog === 'trot'

/**
 * Keeps the figures' state between frames and eases every change: postures blend, a gait
 * fades in and out, the dog walks over to its new place. The walking team stays where it
 * is; the ground moves under it instead.
 */
export class TeamAnimator {
  private time = 0
  private groundOffset = 0
  private dogPosture: Pose = DOG_POSTURES.stand
  private dogGaitWeight = 0
  private lastGait: DogGait = 'walk'
  private handlerGaitWeight = 0
  private lastPace: HandlerPace = 'normal'
  private speed = 0
  private place = { ...PLACES.left }

  step(dt: number, controls: TeamControls): TeamFrame {
    this.time += dt

    const dogGaitOn = isGait(controls.dog)
    if (dogGaitOn) this.lastGait = controls.dog as DogGait
    const posture = DOG_POSTURES[dogGaitOn ? 'stand' : (controls.dog as DogPosture)]
    this.dogPosture = blendPoses(this.dogPosture, posture, 1 - Math.exp(-SETTLE_RATE * dt))
    this.dogGaitWeight = approach(this.dogGaitWeight, dogGaitOn ? 1 : 0, dt)

    const walking = controls.handler !== 'stand'
    if (walking) this.lastPace = controls.handler as HandlerPace
    this.handlerGaitWeight = approach(this.handlerGaitWeight, walking ? 1 : 0, dt)
    this.speed = approach(this.speed, walking ? HANDLER_PACE[this.lastPace].speed : 0, dt)
    this.groundOffset = (this.groundOffset + this.speed * dt) % 1

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
          scalePose(dogGait(this.lastGait, this.time), this.dogGaitWeight),
        ),
        ...this.place,
      },
      handler: {
        pose: addPoses(
          HANDLER_STAND,
          scalePose(handlerGait(this.lastPace, this.time), this.handlerGaitWeight),
        ),
        x: 0,
        z: 0,
        heading: 0,
      },
      groundOffset: this.groundOffset,
    }
  }
}

const scalePose = (pose: Pose, k: number): Pose =>
  Object.fromEntries(Object.entries(pose).map(([name, angle]) => [name, angle * k]))

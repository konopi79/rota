import {
  DOG_FEET,
  DOG_POSTURES,
  dogLegs,
  dogPawsOnGround,
  dogStep,
  type DogGait,
  type DogPosture,
} from './dog'
import {
  HANDLER,
  HANDLER_FEET,
  HANDLER_PACE,
  blendPaceStyle,
  paceStyle,
  type PaceStyle,
  RUNNING_MOTION,
  handlerPose,
  handlerStep,
  type HandlerPace,
} from './handler'
import { BipedStepper, PawStepper, type Body, type FootState, type FootTarget } from './locomotion'
import { angleTo } from './math'
import { blendPoses, lowestPoint, type Pose } from './rig'

/** What the two figures are asked to do. */
export type TeamControls = {
  /** A position, or moving at heel at a walk or a trot. */
  dog: DogPosture | DogGait
  /** Where the dog is relative to the handler. */
  place: 'left' | 'right' | 'front'
  handler: 'stand' | HandlerPace
  /** The team stays where it is while the handler walks (around the dog, on the spot). */
  stay?: boolean
  /** Where the handler will come to a stand when it differs from straight ahead (a path). */
  rest?: Body
  /** A tight bend ahead: the handler slows down to this, m/s. */
  maxSpeed?: number
  /** A step the handler takes as set by hand (field coordinates). */
  footstep?: FootTarget
  /** The dog on a path of its own: its place right now (instead of `place`). */
  dogAt?: { x: number; z: number; heading: number }
}

export type FigureFrame = {
  pose: Pose
  /** Position on the ground (x, z) and heading about y in the team's frame; 0 = facing +z. */
  x: number
  z: number
  heading: number
  /** How far its lowest point is off the ground (a runner between steps), metres. */
  lift?: number
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
  /** Where the stepper has the feet and paws (for checking that the legs reach them). */
  feet: {
    handler: readonly FootState[]
    dog: readonly FootState[]
    dogOnLegs: boolean
    /** The handler stands still, both feet in place. */
    handlerStill: boolean
  }
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

/** The fastest a foot tips heel-to-toe, radians per second (about a walking push-off). */
const FOOT_PITCH_RATE = 6

/** The fastest the handler's pelvis rises, m/s. */
const PELVIS_RISE = 0.5
const PELVIS_RISE_RUNNING = 1.2

/** Faster than this (m/s) a person runs rather than walks. */
const FASTEST_WALK = 1.45

/** The handler's arms and trunk, and the fastest they move, radians per second. */
const UPPER_BODY = ['spine', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow'] as const
const UPPER_BODY_RATE = 5

/** How fast the team picks up speed: the gap shrinks by e every 1/RATE seconds. */
const SET_OFF_RATE = 2.5

/** How fast a change settles: the gap shrinks by e every 1/RATE seconds. */
export const SETTLE_RATE = 5

/** How fast the dog gets up from a sit or down: the gap shrinks by e every 1/RATE s. */
const RISE_RATE = 9

const approach = (from: number, to: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-SETTLE_RATE * dt))

const isGait = (dog: TeamControls['dog']): dog is DogGait => dog === 'walk' || dog === 'trot'

/** A team-frame place on the field, for a team at `team`. */
export const onField = (team: Body, p: { x: number; z: number; heading: number }): Body => ({
  x: team.x + p.x * Math.cos(team.heading) + p.z * Math.sin(team.heading),
  z: team.z - p.x * Math.sin(team.heading) + p.z * Math.cos(team.heading),
  heading: team.heading + p.heading,
})

/**
 * Keeps the figures' state between frames. `advance` eases the speed and the dog's place;
 * the caller then moves the bodies over the field and `pose` puts legs under them: every
 * move of a body is carried by its feet (`locomotion.ts`). The dog stands, walks and
 * trots on its paws; sitting and lying down are postures, blended in and out.
 */
export class TeamAnimator {
  private travelled = 0
  private walked = 0
  private speed = 0
  private lastPace: HandlerPace = 'normal'
  /** How the handler's pace looks right now (blending into a new pace). */
  private style: PaceStyle = paceStyle('normal')
  private place = { ...PLACES.left }
  private dogPosture: Pose = DOG_POSTURES.stand
  /** 1 while the legs carry the dog (standing, moving), 0 sitting or lying. */
  private dogStanding = 1
  private dogGait: DogGait = 'trot'
  private handlerFeet: BipedStepper | null = null
  /** The handler's foot pitches last frame (they change smoothly). */
  private footPitch = [0, 0]
  /** The handler's arms and trunk last frame. */
  private upperBody: Partial<Record<(typeof UPPER_BODY)[number], number>> = {}
  /** The handler's pelvis height last frame. */
  private pelvis = Infinity
  private dogFeet: PawStepper | null = null

  /** How near the dog's planted paws are to the edge of their reach (`PawStepper.strain`). */
  get dogStrain() {
    return this.dogStanding < 0.98 ? 0 : (this.dogFeet?.strain ?? 0)
  }

  /** Speeds up or slows down; how far the team and the handler have gone; the dog's place. */
  advance(dt: number, controls: TeamControls) {
    const walking = controls.handler !== 'stand'
    if (walking) this.lastPace = controls.handler as HandlerPace
    const pace = HANDLER_PACE[this.lastPace]
    // A person sets off over about a step and stops more firmly; walking on, a change of
    // pace takes about a second either way.
    const wanted = walking ? Math.min(pace.speed, controls.maxSpeed ?? Infinity) : 0
    this.speed =
      wanted > this.speed || walking
        ? this.speed + (wanted - this.speed) * (1 - Math.exp(-SET_OFF_RATE * dt))
        : approach(this.speed, wanted, dt)
    // Stopping, the last few centimetres are one firm stop, not a long creep.
    if (!walking && !controls.stay && this.speed < 0.08) this.speed = 0
    this.walked += this.speed * dt
    if (!controls.stay) this.travelled += this.speed * dt
    const target = controls.dogAt ?? PLACES[controls.place]
    // The heading turns the short way round, never by a whole turn at once.
    const heading = this.place.heading + angleTo(this.place.heading, target.heading)
    this.place = controls.dogAt
      ? { x: target.x, z: target.z, heading }
      : {
          x: approach(this.place.x, target.x, dt),
          z: approach(this.place.z, target.z, dt),
          heading: approach(this.place.heading, heading, dt),
        }
    return { travelled: this.travelled, walked: this.walked, speed: this.speed, place: this.place }
  }

  /** Poses for the bodies where the caller has put them on the field this frame. */
  pose(dt: number, controls: TeamControls, handler: Body, dog: Body): TeamFrame {
    // The handler: feet under the body, the pelvis and legs solved to them.
    this.handlerFeet ??= new BipedStepper(HANDLER_FEET, handler)
    const handlerPace = this.lastPace
    // Stopping (the handler told to stand while still moving), the body comes to rest the
    // braking distance ahead.
    const stopping = controls.handler === 'stand' && this.speed > 0
    const rest = !stopping
      ? undefined
      : (controls.rest ?? {
          ...handler,
          x: handler.x + Math.sin(handler.heading) * (this.speed / SETTLE_RATE),
          z: handler.z + Math.cos(handler.heading) * (this.speed / SETTLE_RATE),
        })
    // Too fast to walk — slowing down from a run to a walk — the handler runs on until the
    // speed allows walking steps.
    const gait = this.speed > FASTEST_WALK ? 'fast' : handlerPace
    const feet = this.handlerFeet.update(dt, handler, handlerStep(gait), rest, controls.footstep)
    // How the pace looks changes over about a second, with the speed.
    this.style = blendPaceStyle(
      this.style,
      paceStyle(handlerPace),
      1 - Math.exp(-SET_OFF_RATE * dt),
    )
    const motion = Math.min(1, this.speed / (this.style.rate * this.style.cycleLength))
    const {
      pose: handlerPoseNow,
      pelvis,
      pitch,
    } = handlerPose(feet, handler, this.style, this.handlerFeet.cycle, motion, {
      pitch: this.footPitch,
      maxChange: FOOT_PITCH_RATE * dt,
      pelvis: this.pelvis,
      // A runner bounds up off the foot quicker than a walker rises.
      maxRise:
        (this.style.run > 0.5 && motion > RUNNING_MOTION ? PELVIS_RISE_RUNNING : PELVIS_RISE) * dt,
    })
    this.pelvis = pelvis
    // Running, between steps both feet are off the ground: the body is that much higher
    // than standing on its lowest point would put it.
    const handlerLift = Math.max(0, pelvis + lowestPoint(HANDLER, handlerPoseNow))
    this.footPitch = pitch
    // The arms and trunk follow on: however the pace or speed changes, they move at most
    // as fast as a runner swings an arm.
    for (const part of UPPER_BODY) {
      const before = this.upperBody[part]
      const wanted = handlerPoseNow[part] ?? 0
      const limit = UPPER_BODY_RATE * dt
      handlerPoseNow[part] =
        before === undefined ? wanted : before + Math.max(-limit, Math.min(limit, wanted - before))
      this.upperBody[part] = handlerPoseNow[part]
    }

    // The dog.
    const moving = isGait(controls.dog)
    const posture: DogPosture = moving ? 'stand' : (controls.dog as DogPosture)
    if (moving) this.dogGait = controls.dog as DogGait
    // A dog springs up quicker than it settles down.
    const rate = posture === 'stand' ? RISE_RATE : SETTLE_RATE
    this.dogPosture = blendPoses(this.dogPosture, DOG_POSTURES[posture], 1 - Math.exp(-rate * dt))
    const standing = posture === 'stand' ? 1 : 0
    this.dogStanding += (standing - this.dogStanding) * (1 - Math.exp(-rate * dt))
    this.dogFeet ??= new PawStepper(DOG_FEET[this.dogGait], dog)
    this.dogFeet.setFeet(DOG_FEET[this.dogGait])
    const sitting = posture !== 'stand'
    let dogPose = this.dogPosture
    if (!sitting || this.dogStanding > 0.02) {
      // On its legs (or still settling out of them): paws planted, legs solved to them.
      const paws = sitting ? this.dogFeet.feet : this.dogFeet.update(dt, dog, dogStep(this.dogGait))
      const tail = -0.15 * Math.sin(4 * Math.PI * this.dogFeet.cycle) * motion
      const carried: Pose = {
        ...DOG_POSTURES.stand,
        head: (DOG_POSTURES.stand.head ?? 0) - (this.dogGait === 'trot' ? 0.15 * motion : 0),
        tail: (DOG_POSTURES.stand.tail ?? 0) + tail,
        ...dogLegs(paws, dog),
      }
      dogPose = blendPoses(this.dogPosture, carried, this.dogStanding)
    }
    // Sitting or lying: the paws are where the posture puts them, ready to carry the dog
    // from there when it gets up.
    if (sitting && this.dogStanding <= 0.02) this.dogFeet.plant(dogPawsOnGround(dogPose, dog), dog)

    return {
      dog: { pose: dogPose, ...this.place },
      handler: { pose: handlerPoseNow, x: 0, z: 0, heading: 0, lift: handlerLift },
      travelled: this.travelled,
      walked: this.walked,
      speed: this.speed,
      feet: {
        handler: feet,
        dog: this.dogFeet.feet,
        dogOnLegs: !sitting && this.dogStanding > 0.98,
        handlerStill: this.handlerFeet.still,
      },
    }
  }

  /** `advance` and `pose` for a team standing at the origin (the bodies don't move). */
  step(dt: number, controls: TeamControls): TeamFrame {
    const { place } = this.advance(dt, controls)
    return this.pose(dt, controls, { x: 0, z: 0, heading: 0 }, { ...place })
  }
}

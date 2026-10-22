import type { DogPosture } from './dog'
import { HEEL, type HandlerPace } from './handler'
import { angleTo } from './math'
import {
  AROUND_DOG,
  DOG_AROUND_FROM_HEEL,
  DOG_AROUND_HANDLER,
  DOG_TO_FRONT,
  DOG_TO_HEEL,
  bendAhead,
  type Path,
} from './paths'
import type { Course } from './courses'
import type { FootTarget } from './locomotion'
import { SETTLE_RATE, TeamAnimator, onField, type TeamControls, type TeamFrame } from './team'

/**
 * One exercise as a short script for the team. The captions are i18n keys under
 * `figures.caption`, shown while the step runs. The scripts are in `roz-exercises.ts`.
 */
export type ExerciseStep = { caption: string } & (
  | { walk: number; pace?: HandlerPace } // metres forward, the dog at heel
  | { stop: true } // the handler stops, the dog stops beside
  | { dog: DogPosture } // the dog changes position, the handler stands
  | { wait: number } // seconds
  | { around: 'dog' } // the handler walks around the dog and back to the base place
  | { dogPath: DogPath } // the dog goes along a path round the standing handler
  /**
   * The handler's steps set by hand, one foot after the other: where each foot lands, in
   * the frame of the handler's place as the step starts (+x left, +z ahead); the body
   * follows its feet, the dog keeps to its place at heel.
   */
  | { footwork: FootTarget[] }
  /**
   * The team walks parts `parts[0]` up to (not including) `parts[1]` of a course round
   * equipment (`courses.ts`), the dog at heel — one course over several steps, each with its
   * caption, on from where the last one ended.
   */
  | { course: Course; parts: [number, number]; pace?: HandlerPace }
  /**
   * The team turns by `turn` degrees, positive to the right, the handler walking an arc of
   * `radius` metres — 0 turns the handler on the spot, the dog going round at heel.
   */
  | { turn: number; radius: number }
)

const PATHS: Record<'dog', Path> = { dog: AROUND_DOG }

/**
 * The dog's paths round the handler (`paths.ts`) and where each one leaves the dog: in front
 * of the handler, or at heel.
 */
export type DogPath = 'toFront' | 'aroundHandler' | 'toHeel' | 'aroundFromHeel'
const DOG_PATHS: Record<DogPath, { path: Path; ends: TeamControls['place'] }> = {
  toFront: { path: DOG_TO_FRONT, ends: 'front' },
  aroundHandler: { path: DOG_AROUND_HANDLER, ends: 'left' },
  toHeel: { path: DOG_TO_HEEL, ends: 'left' },
  aroundFromHeel: { path: DOG_AROUND_FROM_HEEL, ends: 'left' },
}
/** The dog on its own: trotting speed, m/s, and how fast it turns at most, rad/s. */
const DOG_PATH_SPEED = 1.4
const DOG_MAX_SPIN = 3.5
/** How hard the dog brakes at the end of its path, m/s². */
const DOG_BRAKING = 3
/** How far the dog's paws are from its middle, metres: turning, they go round that far out. */
const PAW_SWING_ARM = 0.23
/** From the heels to the point the body stands over, metres (the handler's feet). */
const HEEL_TO_BODY = -HEEL[1]
/** Steps set by hand: each foot is down this long before the next one lifts, seconds. */
const FOOTWORK_DWELL = 0.12
/** How quickly the dog takes over the pace the slowing team no longer carries it at, 1/s. */
const DOG_TAKES_OVER = 20
/** The dog's path waits for its body once that is this far behind, metres. */
const DOG_FALLS_BEHIND = 0.08
/** The dog has arrived when its body is this near the end of its path, metres. */
const DOG_ARRIVED = 0.03

export type Exercise = {
  /** Card code, also the card image. */
  code: string
  steps: ExerciseStep[]
  /**
   * Where the card stands (regulation §5.3.1, p. 14): `side` (default) — the exercise
   * starts in a square "vlevo před kartou"; `ahead` — a change of direction starts "cca
   * 120 cm přímo před příslušnou kartou".
   */
  card?: 'side' | 'ahead'
  /** The supplementary card that ends the exercise (D0a–d), shown next to the main card. */
  supplementary?: 'D0a' | 'D0b' | 'D0c' | 'D0d'
  /** The pace the team comes in, from the card before (Z-017 after slow or fast). */
  fromPace?: 'slow' | 'fast'
  /**
   * Where in the exercise space the handler stops, from the usual place (metres, +x to the
   * left, +z towards the card): an exercise that needs room in front stops further back.
   */
  stopAt?: { x: number; z: number }
  /** Where the card stands when not in one of the usual places (station's frame). */
  cardAt?: { x: number; z: number }
  /** Cones and bowls on the field, in the station's frame. */
  cones?: { x: number; z: number }[]
  bowls?: { x: number; z: number }[]
}

/**
 * Where the card stands from the handler's usual stop, the team arriving along +z: right of
 * the team and a little ahead, or 1.2 m straight ahead for a change of direction.
 */
const CARD_PLACE = { side: { x: -0.75, z: 0.45 }, ahead: { x: 0, z: 1.2 } }

/** Where the card stands from where the handler stops in `exercise` (the station). */
export const cardPlace = (exercise: Exercise) => {
  if (exercise.cardAt) return exercise.cardAt
  const card = CARD_PLACE[exercise.card ?? 'side']
  const stop = exercise.stopAt ?? { x: 0, z: 0 }
  return { x: card.x - stop.x, z: card.z - stop.z }
}

/** How long a change of the dog's position takes before the next step starts. */
const POSTURE_TIME = 0.9
/**
 * From the handler's stop to the next step: the dog sits about half a second after the
 * handler stops (Psí škola ABS video, confirmed by the author). The handler's last
 * centimetres of slowing down run on under the next step.
 */
const STOP_TIME = 0.5
/** Pause at the end before the exercise starts over. */
const END_PAUSE = 1.2
/**
 * Walking a bend, a person turns at most this fast, radians per second (the video: a 90° turn
 * takes about a second) — round a tight bend they slow down and take shorter steps.
 */
const MAX_SPIN = Math.PI / 2
/** The dog's body stops as its planted paws reach this strain (`PawStepper.strain`). */
const DOG_STRAIN_LIMIT = 1.15
/** A turn on the spot advances like walking an arc of this radius, metres. */
const PIVOT_RADIUS = 0.25

/** A place on the field and the way it faces (heading 0 = +z, positive towards +x). */
export type Pose = { x: number; z: number; heading: number }

export type ExerciseFrame = TeamFrame & {
  /** The handler's base place and the team's direction, from where the exercise starts. */
  team: Pose
  caption: string | null
  /** The step that runs next (after this frame). */
  stepIndex: number
  finished: boolean
}

/** `p` turned by `angle` about the y axis around (cx, cz), three.js convention. */
const rotateAbout = (p: Pose, cx: number, cz: number, angle: number): Pose => {
  const dx = p.x - cx
  const dz = p.z - cz
  return {
    x: cx + dx * Math.cos(angle) + dz * Math.sin(angle),
    z: cz - dx * Math.sin(angle) + dz * Math.cos(angle),
    heading: p.heading + angle,
  }
}

/**
 * Where a body stands over its feet: between the heels, a heel's length ahead of them, facing
 * the way the feet point between them.
 */
const bodyOver = (feet: readonly { x: number; z: number; yaw: number }[]): Pose => {
  const [a, b] = feet as [
    { x: number; z: number; yaw: number },
    { x: number; z: number; yaw: number },
  ]
  const heading = Math.atan2(Math.sin(a.yaw) + Math.sin(b.yaw), Math.cos(a.yaw) + Math.cos(b.yaw))
  return {
    x: (a.x + b.x) / 2 + HEEL_TO_BODY * Math.sin(heading),
    z: (a.z + b.z) / 2 + HEEL_TO_BODY * Math.cos(heading),
    heading,
  }
}

/** `p` moved `d` metres straight ahead. */
const forward = (p: Pose, d: number): Pose => ({
  ...p,
  x: p.x + d * Math.sin(p.heading),
  z: p.z + d * Math.cos(p.heading),
})

/**
 * A body that follows a moving target like a critically damped spring with the target's
 * own velocity fed forward: no lag at a steady pace, a smooth catch-up after a jolt.
 */
class Follower {
  private at: Pose | null = null
  private velocity = { x: 0, z: 0, heading: 0 }

  /** How fast the target's paws must move over the ground, m/s. */
  get speed() {
    return this.targetSpeed
  }
  private target: Pose | null = null
  private targetSpeed = 0

  /** How far the body is behind its target, metres (turning: at the end of a dog's body). */
  get lag() {
    return this.at && this.target
      ? Math.hypot(
          this.at.x - this.target.x,
          this.at.z - this.target.z,
          0.25 * angleTo(this.at.heading, this.target.heading),
        )
      : 0
  }

  constructor(private readonly stiffness = 12) {}

  /** `hold` < 1 holds the body back (its legs cannot carry it further yet). */
  follow(target: Pose, dt: number, hold = 1): Pose {
    if (!this.at || !this.target || dt <= 0) {
      this.at = { ...target }
      this.target = { ...target }
      return this.at
    }
    const w = this.stiffness
    const turn = angleTo(this.target.heading, target.heading)
    const tv = {
      x: (target.x - this.target.x) / dt,
      z: (target.z - this.target.z) / dt,
      heading: turn / dt,
    }
    this.target = { ...target }
    // How fast its paws must go: the body's own speed and, turning, its ends swinging round.
    this.targetSpeed = Math.hypot(tv.x, tv.z) + PAW_SWING_ARM * Math.abs(tv.heading)
    const gap = {
      x: target.x - this.at.x,
      z: target.z - this.at.z,
      heading: angleTo(this.at.heading, target.heading),
    }
    for (const k of ['x', 'z', 'heading'] as const) {
      const a = w * w * gap[k] + 2 * w * (tv[k] - this.velocity[k])
      this.velocity[k] = (this.velocity[k] + a * dt) * hold
    }
    this.at = {
      x: this.at.x + this.velocity.x * dt,
      z: this.at.z + this.velocity.z * dt,
      heading: this.at.heading + this.velocity.heading * dt,
    }
    return this.at
  }
}

/**
 * Plays an exercise step by step and moves the team over the field: `team` is where the
 * handler's base place is and which way the team faces, starting at the origin facing +z.
 * A walk ends early by the distance the team needs to slow down when a stop or a turn on
 * the spot follows, so the team comes to rest where the script says.
 */
export class ExercisePlayer {
  private animator = new TeamAnimator()
  private index = 0
  private stepTime = 0
  private stepStart = 0
  private posture: DogPosture = 'stand'
  private pace: HandlerPace = 'normal'
  private last: TeamFrame | null = null
  /** Where the handler is off the base place (walking around the dog). */
  private offset = { x: 0, z: 0, heading: 0 }
  private walkedAtStart = 0
  private team: Pose = { x: 0, z: 0, heading: 0 }
  /** Radians of the current turn still to go. */
  private turnLeft = 0
  /** Coming to rest before a turn on the spot. */
  private braking = false
  private dogTrots = false
  /** Steps set by hand: where the handler stood as they began, which is next, how long down. */
  private footworkBase: Pose = { x: 0, z: 0, heading: 0 }
  private footworkIndex = 0
  private footworkDwell = 0
  private footworkOffset: Pose = { x: 0, z: 0, heading: 0 }
  /** A course: where the team stood as it began, how far along it the team has come. */
  private courseBase: Pose = { x: 0, z: 0, heading: 0 }
  private courseWalked = 0
  /** Where the dog keeps to when it is not on a path of its own. */
  private dogPlace: TeamControls['place'] = 'left'
  /** Metres the dog has gone along its current path, and how fast it goes. */
  private dogWalked = 0
  private dogPathSpeed = 0
  private dogBody = new Follower()

  constructor(private readonly exercise: Exercise) {}

  step(dt: number): ExerciseFrame {
    const steps = this.exercise.steps
    const current = steps[this.index]
    const travelled = this.last?.travelled ?? 0
    const walked = this.last?.walked ?? 0
    const speed = this.last?.speed ?? 0
    const starting = this.stepTime === 0
    this.stepTime += dt

    // The dog trots when its place moves briskly — at heel at a normal pace, round the
    // outside of a turn, spinning round in front of the handler — and walks when slow (by
    // its place: a body held back for a paw to step does not change its gait).
    const dogSpeed = this.dogBody.speed
    if (dogSpeed > 0.75) this.dogTrots = true
    else if (dogSpeed < 0.6) this.dogTrots = false
    const dogGait = (_pace: HandlerPace) => (this.dogTrots ? 'trot' : 'walk')
    let controls: TeamControls = { dog: this.posture, place: this.dogPlace, handler: 'stand' }
    let done = false
    if (current && 'walk' in current) {
      this.pace = current.pace ?? this.pace
      controls = { dog: dogGait(this.pace), place: this.dogPlace, handler: this.pace }
      this.posture = 'stand'
      const next = steps[this.index + 1]
      // Stopping for what comes next: a stop, a turn on the spot, the dog going off on its
      // own while the handler stands.
      const brakes =
        next && ('stop' in next || 'dogPath' in next || ('turn' in next && next.radius === 0))
      const braking = brakes ? speed / SETTLE_RATE : 0
      const toGo = current.walk - (travelled - this.stepStart)
      done = toGo <= braking
      // Slowing down into a turn in a small arc, to be at its pace as it begins.
      if (next && 'turn' in next && next.radius > 0) {
        const bend = MAX_SPIN * next.radius
        if (toGo < Math.max(0, speed - bend) / SETTLE_RATE + 0.3) controls.maxSpeed = bend
      }
    } else if (current && 'stop' in current) {
      done = this.stepTime >= STOP_TIME
    } else if (current && 'dog' in current) {
      this.posture = current.dog
      controls = { ...controls, dog: current.dog }
      done = this.stepTime >= POSTURE_TIME
    } else if (current && 'wait' in current) {
      done = this.stepTime >= current.wait
    } else if (current && 'around' in current) {
      const path = PATHS[current.around]
      const left = path.length - (walked - this.walkedAtStart)
      const walking = left > speed / SETTLE_RATE + 0.002
      const bend = bendAhead(path, walked - this.walkedAtStart)
      controls = {
        ...controls,
        handler: walking ? this.pace : 'stand',
        maxSpeed: bend > 0 ? MAX_SPIN / bend : undefined,
        stay: true,
        // The path ends back in the base place.
        rest: onField(this.team, { x: 0, z: 0, heading: 0 }),
      }
      // Done once the handler stands in the base place on both feet.
      done = !walking && speed < 0.01 && (this.last?.feet.handlerStill ?? true)
    } else if (current && 'dogPath' in current) {
      const { path, ends } = DOG_PATHS[current.dogPath]
      if (starting) this.dogWalked = 0
      const left = path.length - this.dogWalked
      // The dog gets up first (from a sit in front), then trots off, slows into tight bends
      // and comes to a stand at the end.
      const onLegs = this.last?.feet.dogOnLegs ?? true
      // Its body follows only as fast as its paws can carry it: as it falls behind, the path
      // eases off and waits for it.
      const keepingUp = Math.min(
        1,
        Math.max(0, (DOG_FALLS_BEHIND - this.dogBody.lag) / (DOG_FALLS_BEHIND / 2)),
      )
      // Going on from walking at heel while the handler stops, the dog keeps its pace over the
      // ground: along its path only as fast as the team no longer carries it.
      const wanted = !onLegs
        ? 0
        : keepingUp *
          Math.min(
            Math.max(0, DOG_PATH_SPEED - speed),
            DOG_MAX_SPIN / Math.max(bendAhead(path, this.dogWalked), 1e-6),
            Math.sqrt(2 * DOG_BRAKING * left),
          )
      // While the team still slows down, the dog takes over its pace at once.
      const rate = speed > 0.05 ? DOG_TAKES_OVER : SETTLE_RATE
      this.dogPathSpeed =
        wanted < this.dogPathSpeed
          ? wanted
          : this.dogPathSpeed + (wanted - this.dogPathSpeed) * (1 - Math.exp(-rate * dt))
      this.dogWalked = Math.min(path.length, this.dogWalked + this.dogPathSpeed * dt)
      this.posture = 'stand'
      controls = {
        dog: dogGait(this.pace),
        place: this.dogPlace,
        handler: 'stand',
        // Getting up it keeps to where it sat, facing the same way.
        dogAt: onLegs ? path.at(this.dogWalked) : undefined,
      }
      done = this.dogWalked >= path.length && this.dogBody.lag < DOG_ARRIVED
      if (done) {
        this.dogPlace = ends
        this.dogPathSpeed = 0
      }
    } else if (current && 'footwork' in current) {
      const feet = this.last?.feet.handler
      if (starting) {
        this.footworkBase = { ...this.team }
        this.footworkIndex = 0
        this.footworkDwell = 0
        // Where the body stands off the point between its feet (they stand a little apart
        // from exactly side by side): kept as it is, so the body never jumps.
        const over = feet ? bodyOver(feet) : this.team
        const c = Math.cos(over.heading)
        const s = Math.sin(over.heading)
        const dx = this.team.x - over.x
        const dz = this.team.z - over.z
        this.footworkOffset = {
          x: c * dx - s * dz,
          z: s * dx + c * dz,
          heading: angleTo(over.heading, this.team.heading),
        }
      }
      // The body is where its feet have taken it.
      if (feet) this.team = onField(bodyOver(feet), this.footworkOffset)
      this.posture = 'stand'
      const target = current.footwork[Math.min(this.footworkIndex, current.footwork.length - 1)]!
      const at = onField(this.footworkBase, { x: target.x, z: target.z, heading: target.yaw })
      controls = {
        dog: dogGait(this.pace),
        place: this.dogPlace,
        handler: 'stand',
        footstep: { foot: target.foot, x: at.x, z: at.z, yaw: at.heading },
      }
      // On to the next step once this one has landed there and taken the weight.
      const foot = this.last?.feet.handler[target.foot]
      const landed =
        foot !== undefined && foot.swing === null && Math.hypot(foot.x - at.x, foot.z - at.z) < 0.01
      this.footworkDwell = landed ? this.footworkDwell + dt : 0
      if (this.footworkDwell >= FOOTWORK_DWELL) {
        this.footworkIndex++
        this.footworkDwell = 0
      }
      done = this.footworkIndex >= current.footwork.length
    } else if (current && 'course' in current) {
      const { path } = current.course
      if (starting && current.parts[0] === 0) {
        this.courseBase = { ...this.team }
        this.courseWalked = 0
      }
      this.pace = current.pace ?? this.pace
      this.posture = 'stand'
      // Round the cones the handler slows down as in any tight bend.
      const bend = bendAhead(path, this.courseWalked)
      controls = {
        dog: dogGait(this.pace),
        place: this.dogPlace,
        handler: this.pace,
        maxSpeed: bend > 0 ? MAX_SPIN / bend : undefined,
      }
    } else if (current && 'turn' in current) {
      if (starting) {
        this.turnLeft = (Math.abs(current.turn) * Math.PI) / 180
        this.braking = current.radius === 0
      }
      this.posture = 'stand'
      // A turn on the spot starts from a stand: the team first comes to rest.
      if (this.braking && speed < 0.1) this.braking = false
      const onTheSpot = current.radius === 0 && !this.braking
      // Handlers slow down into a turn and pick up the pace after it (the video: a 90° turn
      // takes about a second, 180° two); on the spot they step slowly round.
      controls = this.braking
        ? { dog: dogGait('slow'), place: this.dogPlace, handler: 'stand' }
        : {
            dog: dogGait('slow'),
            place: this.dogPlace,
            handler: 'slow',
            stay: onTheSpot,
            maxSpeed: MAX_SPIN * (current.radius || PIVOT_RADIUS),
          }
    } else {
      done = this.stepTime >= END_PAUSE
    }

    const advanced = this.animator.advance(dt, controls)
    const moved = advanced.travelled - travelled
    const frameWalked = advanced.walked

    if (current && 'turn' in current) {
      const sign = current.turn > 0 ? -1 : 1 // right = towards −x = heading decreasing
      if (current.radius === 0 && this.braking) {
        this.team = forward(this.team, moved)
      } else if (current.radius === 0) {
        const angle = Math.min((frameWalked - walked) / PIVOT_RADIUS, this.turnLeft)
        this.team = { ...this.team, heading: this.team.heading + sign * angle }
        this.turnLeft -= angle
        this.team = forward(this.team, moved)
      } else {
        const arc = Math.min(moved, this.turnLeft * current.radius)
        // The centre of the arc is to the side the team turns: left = +x of its frame.
        const side = sign * current.radius
        const cx = this.team.x + side * Math.cos(this.team.heading)
        const cz = this.team.z - side * Math.sin(this.team.heading)
        const turned = rotateAbout(this.team, cx, cz, (sign * arc) / current.radius)
        this.team = forward(turned, moved - arc)
        this.turnLeft -= arc / current.radius
      }
      done = this.turnLeft <= 1e-6
    } else if (current && 'course' in current) {
      const { path, starts } = current.course
      const end = starts[current.parts[1]] ?? path.length
      this.courseWalked = Math.min(end, this.courseWalked + moved)
      this.team = onField(this.courseBase, path.at(this.courseWalked))
      done = this.courseWalked >= end - 1e-6
    } else {
      this.team = forward(this.team, moved)
    }

    if (current && 'around' in current) {
      this.offset = PATHS[current.around].at(frameWalked - this.walkedAtStart)
    } else {
      // Back on the base place: whatever the path left over settles away.
      const k = 1 - Math.exp(-SETTLE_RATE * dt)
      this.offset = {
        x: this.offset.x * (1 - k),
        z: this.offset.z * (1 - k),
        heading: angleTo(0, this.offset.heading) * (1 - k),
      }
    }

    // The bodies on the field; the animator puts legs under them. The dog keeps to its place
    // at heel but its body moves only as its legs can carry it: it follows the place
    // springily — exactly while the team walks on, a moment behind when the team turns
    // sharply — and the frame says where it really is.
    // …and no faster than its legs carry it: with a paw at the edge of its reach, the body
    // waits for that paw to step.
    const hold = Math.max(0.1, Math.min(1, (DOG_STRAIN_LIMIT - this.animator.dogStrain) / 0.25))
    const dog = this.dogBody.follow(onField(this.team, advanced.place), dt, hold)
    const frame = this.animator.pose(dt, controls, onField(this.team, this.offset), dog)
    const c = Math.cos(this.team.heading)
    const s = Math.sin(this.team.heading)
    const dx = dog.x - this.team.x
    const dz = dog.z - this.team.z
    frame.dog = {
      ...frame.dog,
      x: c * dx - s * dz,
      z: s * dx + c * dz,
      heading: dog.heading - this.team.heading,
    }
    this.last = frame

    if (done) {
      this.index++
      this.stepTime = 0
      this.stepStart = frame.travelled
      this.walkedAtStart = frame.walked
    }
    return {
      ...frame,
      handler: { ...frame.handler, ...this.offset },
      team: this.team,
      caption: current?.caption ?? null,
      stepIndex: this.index,
      finished: this.index > steps.length,
    }
  }
}

/**
 * Where the station is — the place the exercise starts — in metres from the start: the
 * walks before the first other step. The team walks there straight along +z.
 */
export const stationOf = (exercise: Exercise): number => {
  let distance = 0
  for (const step of exercise.steps) {
    // A change of pace starts the exercise without stopping.
    if (!('walk' in step) || (distance > 0 && step.pace)) break
    distance += step.walk
  }
  return distance
}

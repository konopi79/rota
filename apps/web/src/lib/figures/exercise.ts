import type { DogPosture } from './dog'
import type { HandlerPace } from './handler'
import { AROUND_DOG, type Path } from './paths'
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
  /**
   * The team turns by `turn` degrees, positive to the right, the handler walking an arc of
   * `radius` metres — 0 turns the handler on the spot, the dog going round at heel.
   */
  | { turn: number; radius: number }
)

const PATHS: Record<'dog', Path> = { dog: AROUND_DOG }

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

/** `p` moved `d` metres straight ahead. */
const forward = (p: Pose, d: number): Pose => ({
  ...p,
  x: p.x + d * Math.sin(p.heading),
  z: p.z + d * Math.cos(p.heading),
})

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

  constructor(private readonly exercise: Exercise) {}

  step(dt: number): ExerciseFrame {
    const steps = this.exercise.steps
    const current = steps[this.index]
    const travelled = this.last?.travelled ?? 0
    const walked = this.last?.walked ?? 0
    const speed = this.last?.speed ?? 0
    const starting = this.stepTime === 0
    this.stepTime += dt

    // The dog trots at heel at a normal or fast pace and walks with a slow handler.
    const dogGait = (pace: HandlerPace) => (pace === 'slow' ? 'walk' : 'trot')
    let controls: TeamControls = { dog: this.posture, place: 'left', handler: 'stand' }
    let done = false
    if (current && 'walk' in current) {
      this.pace = current.pace ?? this.pace
      controls = { dog: dogGait(this.pace), place: 'left', handler: this.pace }
      this.posture = 'stand'
      const next = steps[this.index + 1]
      const brakes = next && ('stop' in next || ('turn' in next && next.radius === 0))
      const braking = brakes ? speed / SETTLE_RATE : 0
      done = travelled - this.stepStart >= current.walk - braking
    } else if (current && 'stop' in current) {
      done = this.stepTime >= STOP_TIME
    } else if (current && 'dog' in current) {
      this.posture = current.dog
      controls = { ...controls, dog: current.dog }
      done = this.stepTime >= POSTURE_TIME
    } else if (current && 'wait' in current) {
      done = this.stepTime >= current.wait
    } else if (current && 'around' in current) {
      const left = PATHS[current.around].length - (walked - this.walkedAtStart)
      const walking = left > speed / SETTLE_RATE + 0.002
      controls = { ...controls, handler: walking ? this.pace : 'stand', stay: true }
      done = !walking && speed < 0.01
    } else if (current && 'turn' in current) {
      if (starting) this.turnLeft = (Math.abs(current.turn) * Math.PI) / 180
      this.posture = 'stand'
      const onTheSpot = current.radius === 0
      // Handlers slow down into a turn and pick up the pace after it (the video: a 90° turn
      // takes about a second, 180° two); on the spot they step slowly round.
      controls = { dog: dogGait('slow'), place: 'left', handler: 'slow', stay: onTheSpot }
    } else {
      done = this.stepTime >= END_PAUSE
    }

    const advanced = this.animator.advance(dt, controls)
    const moved = advanced.travelled - travelled
    const frameWalked = advanced.walked

    if (current && 'turn' in current) {
      const sign = current.turn > 0 ? -1 : 1 // right = towards −x = heading decreasing
      if (current.radius === 0) {
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
        heading: this.offset.heading * (1 - k),
      }
    }

    // The bodies on the field; the animator puts legs under them.
    const frame = this.animator.pose(
      dt,
      controls,
      onField(this.team, this.offset),
      onField(this.team, advanced.place),
    )
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
    if (!('walk' in step)) break
    distance += step.walk
  }
  return distance
}

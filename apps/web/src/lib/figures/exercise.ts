import type { DogPosture } from './dog'
import type { HandlerPace } from './handler'
import { SETTLE_RATE, TeamAnimator, type TeamControls, type TeamFrame } from './team'

/**
 * One exercise as a short script for the team. The captions are i18n keys under
 * `figures.caption`, shown while the step runs.
 */
export type ExerciseStep = { caption: string } & (
  | { walk: number; pace?: HandlerPace } // metres forward, the dog at heel
  | { stop: true } // the handler stops, the dog stops beside
  | { dog: DogPosture } // the dog changes position, the handler stands
  | { wait: number } // seconds
)

export type Exercise = {
  /** Card code, also the card image. */
  code: string
  steps: ExerciseStep[]
}

/**
 * Z-001 Stop: "Tým se zastaví u karty v místě pro provedení cviku a zaujme základní
 * pozici. (pes si může sednout sám či na povel)" — regulation, appendix 1, p. 18. Timing
 * from the Psí škola ABS overview video: the dog sits about half a second after the
 * handler stops, the team holds the position for a moment and walks on.
 */
export const Z001: Exercise = {
  code: 'Z-001',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 1.5, caption: 'basePosition' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * Z-002 Stop – lehni: "Tým se zastaví u karty v místě pro vykonání cviku a zaujme základní
 * pozici. Na povel psovoda si pes lehá." — regulation, appendix 1, p. 18; "po zaujetí každé
 * pozice psovod stojí vedle psa". In the video the dog lies down about a second after it
 * sat, stays down for a moment and the team walks on straight from the down.
 */
export const Z002: Exercise = {
  code: 'Z-002',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 0.6, caption: 'basePosition' },
    { dog: 'down', caption: 'down' },
    { wait: 1.2, caption: 'downHold' },
    { walk: 3, caption: 'leave' },
  ],
}

/** The exercises the page can play, in card order. */
export const EXERCISES: Exercise[] = [Z001, Z002]

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

export type ExerciseFrame = TeamFrame & {
  caption: string | null
  /** The step that runs next (after this frame). */
  stepIndex: number
  finished: boolean
}

/**
 * Plays an exercise step by step. A walk ends early by the distance the team needs to
 * slow down when a stop follows, so the team comes to rest where the script says.
 */
export class ExercisePlayer {
  private animator = new TeamAnimator()
  private index = 0
  private stepTime = 0
  private stepStart = 0
  private posture: DogPosture = 'stand'
  private pace: HandlerPace = 'normal'
  private last: TeamFrame | null = null

  constructor(private readonly exercise: Exercise) {}

  step(dt: number): ExerciseFrame {
    const steps = this.exercise.steps
    const current = steps[this.index]
    const travelled = this.last?.travelled ?? 0
    const speed = this.last?.speed ?? 0
    this.stepTime += dt

    let controls: TeamControls = { dog: this.posture, place: 'left', handler: 'stand' }
    let done = false
    if (current && 'walk' in current) {
      this.pace = current.pace ?? this.pace
      controls = { dog: this.pace === 'slow' ? 'walk' : 'trot', place: 'left', handler: this.pace }
      this.posture = 'stand'
      const next = steps[this.index + 1]
      const braking = next && 'stop' in next ? speed / SETTLE_RATE : 0
      done = travelled - this.stepStart >= current.walk - braking
    } else if (current && 'stop' in current) {
      done = this.stepTime >= STOP_TIME
    } else if (current && 'dog' in current) {
      this.posture = current.dog
      controls = { ...controls, dog: current.dog }
      done = this.stepTime >= POSTURE_TIME
    } else if (current && 'wait' in current) {
      done = this.stepTime >= current.wait
    } else {
      done = this.stepTime >= END_PAUSE
    }

    const frame = this.animator.step(dt, controls)
    this.last = frame
    if (done) {
      this.index++
      this.stepTime = 0
      this.stepStart = frame.travelled
    }
    return {
      ...frame,
      caption: current?.caption ?? null,
      stepIndex: this.index,
      finished: this.index > steps.length,
    }
  }
}

/**
 * Where the team stands at the station — at rest after the first stop, when it walks on —
 * in metres walked. The card is placed relative to it.
 */
export const stationOf = (exercise: Exercise): number => {
  const player = new ExercisePlayer(exercise)
  const firstStop = exercise.steps.findIndex((s) => 'stop' in s)
  const walkOn = exercise.steps.findIndex((s, i) => i > firstStop && 'walk' in s)
  let frame = player.step(0)
  for (let i = 0; i < 60 * 60 && !frame.finished && frame.stepIndex < walkOn; i++)
    frame = player.step(1 / 60)
  return frame.travelled
}

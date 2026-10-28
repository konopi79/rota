import type { DogPosture } from './dog'
import { HEEL, type HandlerPace } from './handler'
import { angleTo, ease } from './math'
import {
  AROUND_DOG,
  DOG_AROUND_FROM_HEEL,
  DOG_AROUND_HANDLER,
  DOG_BEHIND_TO_RIGHT,
  DOG_FRONT_TO_RIGHT,
  DOG_TO_FRONT,
  DOG_TO_HEEL,
  DOG_WALKING_AROUND,
  DOG_WALKING_BEHIND,
  DOG_WALKING_IN_FRONT,
  bendAhead,
  type Path,
} from './paths'
import type { Course } from './courses'
import type { FootTarget } from './locomotion'
import {
  FIRM_STOP,
  PLACES,
  SETTLE_RATE,
  TeamAnimator,
  onField,
  type TeamControls,
  type TeamFrame,
} from './team'

/**
 * One exercise as a short script for the team. The captions are i18n keys under
 * `figures.caption`, shown while the step runs. The scripts are in `roz-exercises.ts`.
 */
export type ExerciseStep = { caption: string } & (
  | {
      walk: number // metres forward, the dog at heel
      pace?: HandlerPace
      /** Meanwhile the dog changes sides, behind the handler or ahead across in front. */
      dogChanges?: WalkingDogPath
    }
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
  | {
      footwork: FootTarget[]
      /**
       * Taken out of a walk: the walk's last step lands with this foot (0 left, 1 right),
       * and the steps are set from where it stands — level with it — not from the body.
       */
      fromFoot?: 0 | 1
    }
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
  | {
      turn: number
      radius: number
      /**
       * Meanwhile the dog goes this path round the handler (in the turning team's frame),
       * from heel back to heel, keeping step with the turn.
       */
      dogRound?: DogPath
      /**
       * The card turns the team by the dog's side, not by left and right (Z-010 "do té strany,
       * na které se nachází pes", 2-232 "směrem k sobě", 3-315 "od psa"): with the dog on the
       * right the handler turns the other way.
       */
      bySide?: true
      /**
       * Meanwhile the dog turns about on its own, `way` (1 left, −1 right), round a point
       * `pivot` off its middle (`x` out away from the handler, `z` ahead — its front paws
       * 0.2 ahead), and so ends at the handler's other leg (a turn of 180° on the spot).
       */
      dogTurns?: {
        way: 1 | -1
        pivot: { x: number; z: number }
        /** Meanwhile it moves this far out sideways, away from the handler, metres. */
        out?: number
        /** How far it turns, degrees (180, the default, takes it to the other leg). */
        degrees?: number
        /**
         * Turning on its own time, so long (s) — evenly, not keeping step with the handler's
         * turn (3-315: the handler's circle speeds up and slows down); the team goes on once
         * both have come round.
         */
        seconds?: number
      }
    }
)

const PATHS: Record<'dog', Path> = { dog: AROUND_DOG }

/** A path round the handler the other way round: left and right swapped (+x is left). */
const mirroredPaths = new WeakMap<Path, Path>()
export const mirrored = (path: Path): Path => {
  const known = mirroredPaths.get(path)
  if (known) return known
  const flipped: Path = {
    length: path.length,
    at: (s) => {
      const p = path.at(s)
      return { x: -p.x, z: p.z, heading: -p.heading }
    },
  }
  mirroredPaths.set(path, flipped)
  return flipped
}

/** The other leg; in front stays in front. */
const otherSide = (place: TeamControls['place']): TeamControls['place'] =>
  place === 'left' ? 'right' : place === 'right' ? 'left' : place

/**
 * The dog's paths round the handler (`paths.ts`) and where each one leaves the dog: in front
 * of the handler, or at heel.
 */
export type DogPath =
  'toFront' | 'aroundHandler' | 'toHeel' | 'aroundFromHeel' | 'behindToRight' | 'frontToRight'
/**
 * `even`: the dog goes the whole way at one pace, the pace of its tightest bend, rather than
 * slowing into each bend and picking up after it (1-125, the author).
 */
const DOG_PATHS: Record<DogPath, { path: Path; ends: TeamControls['place']; even?: boolean }> = {
  toFront: { path: DOG_TO_FRONT, ends: 'front' },
  aroundHandler: { path: DOG_AROUND_HANDLER, ends: 'left' },
  toHeel: { path: DOG_TO_HEEL, ends: 'left' },
  aroundFromHeel: { path: DOG_AROUND_FROM_HEEL, ends: 'left' },
  behindToRight: { path: DOG_BEHIND_TO_RIGHT, ends: 'right' },
  frontToRight: { path: DOG_FRONT_TO_RIGHT, ends: 'right', even: true },
}
/** The dog's ways to the handler's other side while the team walks on (`paths.ts`). */
/**
 * The dog's own ways round the walking handler (`paths.ts`), in the team's frame: to the
 * other side behind or in front, round the handler from the front (2-208), a spin out on
 * its own (2-219). Where each leaves it, and whether it faces the way it goes over the
 * ground or as the path says (spinning).
 */
export type WalkingDogPath = 'behind' | 'inFront' | 'around' | 'spin'
const WALKING_PATHS: Record<
  Exclude<WalkingDogPath, 'spin'>,
  {
    path: Path
    ends: TeamControls['place']
    facesAsPath?: boolean
    /** Over this share of the walk at each end the dog picks up its pace and slows again. */
    ramps?: number
  }
> = {
  behind: { path: DOG_WALKING_BEHIND, ends: 'right' },
  inFront: { path: DOG_WALKING_IN_FRONT, ends: 'right' },
  around: { path: DOG_WALKING_AROUND, ends: 'left', ramps: 0.3 },
}
/** The dog on its own: trotting speed, m/s, and how fast it turns at most, rad/s. */
const DOG_PATH_SPEED = 1.4
const DOG_MAX_SPIN = 3.5
/** How hard the dog brakes at the end of its path, m/s². */
const DOG_BRAKING = 3
/** How far the dog's paws are from its middle, metres: turning, they go round that far out. */
const PAW_SWING_ARM = 0.23
/** Steps set by hand: about how long each takes, a moment down included, seconds. */
const STEP_TIME = 0.7
/** From the heels to the point the body stands over, metres (the handler's feet). */
const HEEL_TO_BODY = -HEEL[1]
/** Into steps taken out of a walk the handler slows down over the last metres, to this, m/s. */
const SLOW_INTO_STEPS = 1.5
const INTO_STEPS_SPEED = 0.7
/** How quickly the body taken out of a walk settles over the steps, 1/s. */
const OUT_OF_WALK_SETTLE = 6

/** Steps set by hand: each foot is down this long before the next one lifts, seconds. */
const FOOTWORK_DWELL = 0.12

/** A dog sitting or lying in front gets up once the handler has stepped back this far, metres. */
const GETS_UP_AFTER = 0.08
/** Following a step back, the dog keeps off the forward foot by this much more than its lead. */
const THIGH_LEAD = 1.3
/** The fastest a dog in front moves following the handler's feet, m/s. */
const FRONT_DOG_SPEED = 0.45
/** How fast a dog in front follows the handler's feet (each of two easings), 1/s. */
const FRONT_FOLLOWS = 5
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
   * The dog starts at the handler's right leg (a start "R", or after a change of side). Its
   * own ways round the handler, and its own turns, go the other way round (`mirrored`); the
   * handler's turns stay as the card says, unless they go by the dog's side (`bySide`).
   */
  dogStarts?: 'right'
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

/**
 * The place where the exercise starts (regulation §5.3.1, p. 8), a square on the ground:
 * "ve čtverci o délce strany maximálně 120 cm, který se nachází vlevo před kartou" — the
 * card at its front right corner; for a change of direction or a side step "cca 120 cm
 * přímo před příslušnou kartou", the square round that point. "Rozhodující zde jsou nohy
 * psovoda."
 */
const SPACE = { side: { x: 0.15, z: -0.15 }, ahead: { x: 0, z: 0 } }
export const SPACE_SIDE = 1.2

/**
 * Which side of the team the card stands on, where the exercise's description says so — "Není-li
 * v popisu cviku uvedeno jinak" (§5.3.1): round cones and bowls the card stands before the
 * equipment and the team passes it on its right (Z-018, Z-026) or on its left (Z-019, Z-027,
 * the slaloms "první kužel po své levé straně", the figure eight "karta vždy vlevo od psa").
 * `null`: the usual places.
 */
export const passesCard = (exercise: Exercise): 'left' | 'right' | null =>
  exercise.cardAt ? (exercise.cardAt.x > 0 ? 'left' : 'right') : null

/**
 * The middle of the exercise's space, in the station's frame: always as far from the card —
 * before it, on the side the team passes it (`passesCard`; the usual "vlevo před kartou"
 * passing it on the right).
 */
export const exerciseSpace = (exercise: Exercise) => {
  const card = cardPlace(exercise)
  const passes = passesCard(exercise)
  if (passes) {
    const usual = CARD_PLACE.side
    const side = SPACE.side.x - usual.x
    return {
      x: card.x + (passes === 'right' ? side : -side),
      z: card.z + SPACE.side.z - usual.z,
    }
  }
  const space = SPACE[exercise.card ?? 'side']
  const stop = exercise.stopAt ?? { x: 0, z: 0 }
  return { x: space.x - stop.x, z: space.z - stop.z }
}

/**
 * How far along (0–1) something gets at `x` of the way when it picks up its pace evenly over
 * the first `ramp` share and slows evenly over the last (`ramp` 0: steadily all the way).
 */
const ramped = (x: number, ramp: number) => {
  if (ramp <= 0) return x
  const total = 1 - ramp
  if (x < ramp) return (x * x) / (2 * ramp) / total
  if (x > 1 - ramp) return 1 - (1 - x) ** 2 / (2 * ramp) / total
  return (ramp / 2 + (x - ramp)) / total
}

/**
 * Spinning by the walking handler (2-219): for this long (s) the dog runs on ahead, gaining
 * this much on the handler (m) and picking up the pace it runs at (m/s);
 * then into heel over this long (s). The handler meanwhile walks no faster than this (m/s).
 */
const SPIN_AHEAD_TIME = 0.5
const SPIN_GAIN = 0.3
const SPIN_RUN = 1.3
const SPIN_INTO_HEEL = 1.8
/** How long the dog takes to turn round, s. */
const SPIN_TIME = 2.6
/** Over this share of the turn at each end it picks up its turning, or eases it off. */
const SPIN_TURN_RAMP = 0.2
const SPIN_PACE = 0.8
/** Running on ahead, the dog moves this far out from the handler, metres. */
const SPIN_OUT = 0.15

/**
 * A cubic over `t` (0–1) from `a` going at `va` to `b` going at `vb`, over `span` seconds —
 * smooth in place and pace at both ends.
 */
const hermite = (t: number, a: number, va: number, b: number, vb: number, span: number) => {
  const t2 = t * t
  const t3 = t2 * t
  return (
    (2 * t3 - 3 * t2 + 1) * a +
    (t3 - 2 * t2 + t) * span * va +
    (-2 * t3 + 3 * t2) * b +
    (t3 - t2) * span * vb
  )
}

/** Going its own way round the walking handler, the dog turns this many times faster at most. */
const WALKING_TURN = 2

/** Going a path at one pace, the dog keeps this share of its fastest turn in hand. */
const EVEN_HEADROOM = 0.8

/** How sharply a path bends at most, radians per metre (worked out once per path). */
const tightest = new WeakMap<Path, number>()
const tightestBend = (path: Path) => {
  let most = tightest.get(path)
  if (most === undefined) {
    most = 0
    for (let s = 0; s < path.length; s += 0.05) most = Math.max(most, bendAhead(path, s, 0.05, 0))
    tightest.set(path, most)
  }
  return most
}

/** From the main card to the supplementary card standing next to it, metres. */
const SUPPLEMENTARY_GAP = 0.55

/**
 * Where the supplementary card stands, when the exercise has one (station frame): "Karty
 * popisující konec jednoho cviku jsou umístěny těsně vpravo vedle anebo pod hlavní kartou"
 * (regulation p. 8) — right next to it.
 */
export const supplementaryPlace = (exercise: Exercise) => {
  if (!exercise.supplementary) return null
  const card = cardPlace(exercise)
  return { x: card.x - SUPPLEMENTARY_GAP, z: card.z }
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
/** A turn in an arc reaches its full bend over this much of it, radians. */
const TURN_IN = 0.35
/** A turn on the spot advances like walking an arc of this radius, metres. */
const PIVOT_RADIUS = 0.25

/** A place on the field and the way it faces (heading 0 = +z, positive towards +x). */
export type Pose = { x: number; z: number; heading: number }

export type ExerciseFrame = TeamFrame & {
  /** The handler's base place and the team's direction, from where the exercise starts. */
  team: Pose
  caption: string | null
  /**
   * The dog is at the other leg than its script was written for: the caption reads with left
   * and right swapped (`figures.captionRight`).
   */
  flipped: boolean
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
/** How far the handler's forward foot is ahead of the body, metres. */
const footAhead = (feet: readonly { x: number; z: number }[], body: Pose) =>
  Math.max(
    ...feet.map(
      (f) => (f.x - body.x) * Math.sin(body.heading) + (f.z - body.z) * Math.cos(body.heading),
    ),
  )

/** A field place in the frame of a team at `team` (the inverse of `onField`). */
const inTeam = (team: Pose, p: Pose): Pose => {
  const dx = p.x - team.x
  const dz = p.z - team.z
  const c = Math.cos(team.heading)
  const s = Math.sin(team.heading)
  return { x: c * dx - s * dz, z: s * dx + c * dz, heading: p.heading - team.heading }
}

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

/** A path point moved by `shift`, the less the further along the path (`s` metres). */
const shifted = (p: Pose, shift: { x: number; z: number }, s: number): Pose => {
  const left = Math.max(0, 1 - s / SHIFT_FADES)
  return { ...p, x: p.x + shift.x * left, z: p.z + shift.z * left }
}
/** Over this much of its path, metres, a dog's path shifted to where it really is fades. */
const SHIFT_FADES = 0.8

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
  private animator: TeamAnimator
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
  /** A dog turning about by itself: where it stood on the field as the turn began. */
  private turnDogFrom: Pose | null = null
  /**
   * A dog spinning by the walking handler: where it set off (field) and at what pace; where it
   * came out of the loop (team's frame) and how much faster than the team it went then.
   */
  private spinFrom: Pose = { x: 0, z: 0, heading: 0 }
  private spinPace = 0
  private spunTo: Pose = { x: 0, z: 0, heading: 0 }
  /** …and where it is on the field, going round the loop. */
  private spinAt: Pose = { x: 0, z: 0, heading: 0 }
  /** …and how far round it turns, radians (one turn less what it turned running out). */
  private spinTurn = 2 * Math.PI
  /** How far, and how fast, it had turned out running into the spin. */
  private spinTurned = 0
  private spinRate = 0
  private spunPace = 0
  /** The dog's heading in the team's frame, going its own way round the walking handler. */
  private walkingDogHeading = 0
  /** Where the dog's body goes this frame on the field, when a step says so exactly. */
  private dogAim: Pose | null = null
  /** Coming to rest before a turn on the spot. */
  private braking = false
  private dogTrots = false
  /** Steps set by hand: where the handler stood as they began, which is next, how long down. */
  private footworkBase: Pose = { x: 0, z: 0, heading: 0 }
  private footworkIndex = 0
  private footworkDwell = 0
  private footworkOffset: Pose = { x: 0, z: 0, heading: 0 }
  /** Steps set by hand: the body glides from here to there over this long. */
  private footworkFrom: Pose = { x: 0, z: 0, heading: 0 }
  private footworkTo: Pose = { x: 0, z: 0, heading: 0 }
  private footworkTime = 0
  /** The walking speed steps taken out of a walk set off with, m/s. */
  private footworkSpeed = 0
  private footworkDuration = 1
  /** A dog in front following the feet: how far forward the forward foot stood at first, and
   *  where on the field the dog is headed (eased) and is (eased again). */
  private footRest = 0
  /** How far out to the dog's side the handler's foot on that side stood at first. */
  private footRestOut = 0
  private frontAim = { x: 0, z: 0 }
  private frontDog = { x: 0, z: 0 }
  /** Where the dog's body is in the team's frame, before it lies down over its forelegs. */
  private dogAt: Pose = { x: 0, z: 0, heading: 0 }
  /** How far in front of the handler the dog stood as the steps began, metres. */
  private frontStart = 0
  /** A course: where the team stood as it began, how far along it the team has come. */
  private courseBase: Pose = { x: 0, z: 0, heading: 0 }
  private courseWalked = 0
  /** Where the dog keeps to when it is not on a path of its own. */
  private dogPlace: TeamControls['place']
  /** Metres the dog has gone along its current path, and how fast it goes. */
  private dogWalked = 0
  private dogPathSpeed = 0
  private dogPathShift = { x: 0, z: 0 }
  private dogBody = new Follower()
  /** The ways the current step goes, as from the leg the dog set off from (`side`). */
  private dogWay: { path: Path; ends: TeamControls['place']; even?: boolean } | null = null
  private walkingWay: (typeof WALKING_PATHS)[keyof typeof WALKING_PATHS] | null = null
  private aroundPath: Path | null = null
  /** −1 while a turn step goes the other way round, the dog having set off on the right. */
  private turnBy: 1 | -1 = 1

  constructor(private readonly exercise: Exercise) {
    this.flipped = exercise.dogStarts === 'right'
    this.dogPlace = this.flipped ? 'right' : 'left'
    this.animator = new TeamAnimator(this.dogPlace)
  }

  /**
   * The dog is at the other leg than its script was written for (`dogStarts`): the scripts
   * have it start at the left leg, so from the right one its ways round the handler, its own
   * turns, and the handler's ways round it go the other way round, and leave it at the other
   * leg than the script says. Until it comes into heel from in front: the D0 cards bring it
   * to the left leg wherever it came from (p. 17), as in the script.
   */
  private flipped: boolean

  /** A way of the dog's own, or the handler's round the dog, as it goes now (`flipped`). */
  private side<T extends { path: Path; ends?: TeamControls['place'] }>(way: T): T {
    if (this.dogPlace === 'front') this.flipped = false
    if (!this.flipped) return way
    return { ...way, path: mirrored(way.path), ...(way.ends && { ends: otherSide(way.ends) }) }
  }

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
      // Stopping for what comes next: a stop, a turn on the spot, steps set by hand, the dog
      // going off on its own while the handler stands.
      const outOfWalk = next && 'footwork' in next && next.fromFoot !== undefined
      const brakes =
        next &&
        ('stop' in next ||
          'dogPath' in next ||
          ('footwork' in next && !outOfWalk) ||
          ('turn' in next && next.radius === 0))
      const braking = brakes ? speed / SETTLE_RATE : 0
      const toGo = current.walk - (travelled - this.stepStart)
      done = toGo <= braking
      // Into steps set by hand the handler slows to a stand first — the steps then go on at
      // once, with no pause and the dog left standing.
      if (next && 'footwork' in next && !outOfWalk && done) {
        controls.handler = 'stand'
        done = speed < 0.01 && (this.last?.feet.handlerStill ?? true)
      }
      // …or, taken out of the walk, at a slower pace the steps go on the moment the walk's
      // last step has landed with that foot.
      if (next && 'footwork' in next && next.fromFoot !== undefined) {
        if (toGo < SLOW_INTO_STEPS) controls.maxSpeed = INTO_STEPS_SPEED
        const foot = this.last?.feet.handler[next.fromFoot]
        const landed = foot !== undefined && foot.swing === null && foot.stance < 0.15
        done = (toGo <= 0.3 && landed) || toGo < -1
      }
      // Slowing down into a turn in a small arc, to be at its pace as it begins.
      if (next && 'turn' in next && next.radius > 0) {
        const bend = MAX_SPIN * next.radius
        if (toGo < Math.max(0, speed - bend) / SETTLE_RATE + 0.3) controls.maxSpeed = bend
      }
      // The dog changing sides on the way: along its path in the team's frame as the team
      // walks the step, facing the way it goes over the ground — the team's way and its own.
      // 2-219 "otočka vně od psovoda … Po dokončení otočky se pes vrací k noze": the dog turns
      // once round to the left where it is, the handler walking on, then catches up into heel.
      // The author: as short a spin as can be, and straight back into heel — the dog first goes
      // on a little ahead, the handler slows a touch meanwhile so as not to walk off from it.
      if (current.dogChanges === 'spin') {
        // The author: a short run ahead flowing straight into the spin, the spin smooth and all
        // but on the spot, then into heel — the handler slowing a touch meanwhile. Timed, not
        // by the walk.
        controls.maxSpeed = SPIN_PACE
        const t = this.stepTime
        const loop = SPIN_TIME
        if (starting) {
          this.spinFrom = onField(this.team, this.dogAt)
          this.spinPace = speed
        }
        const from = this.spinFrom
        const reach = this.spinPace * SPIN_AHEAD_TIME * 0.85 + SPIN_GAIN
        if (t < SPIN_AHEAD_TIME + loop) {
          let forwardBy = 0
          let leftBy = 0
          let turned = 0
          if (t < SPIN_AHEAD_TIME) {
            // On ahead, picking up the loop's pace (a cubic from the walk's), and a little out
            // from the handler — its tail swinging out of the loop then keeps off their legs.
            const u = t / SPIN_AHEAD_TIME
            forwardBy = hermite(u, 0, this.spinPace, reach, SPIN_RUN, SPIN_AHEAD_TIME)
            leftBy = SPIN_OUT * u * u
            // Facing the way it goes (measured over a short stretch that stays within the run).
            const [a, b] = u > 0.99 ? [0.99, 1] : [u, u + 0.01]
            const onwards =
              hermite(b, 0, this.spinPace, reach, SPIN_RUN, SPIN_AHEAD_TIME) -
              hermite(a, 0, this.spinPace, reach, SPIN_RUN, SPIN_AHEAD_TIME)
            const outwards = SPIN_OUT * (b * b - a * a)
            turned = Math.atan2(outwards, onwards)
            this.spinTurn = 2 * Math.PI - turned
            // How fast it is turning out as it goes into the spin, which carries on from that.
            this.spinRate = dt > 0 ? (turned - this.spinTurned) / dt : 0
            this.spinTurned = turned
          }
          const side = Math.sign(PLACES[this.dogPlace].x)
          if (t < SPIN_AHEAD_TIME) {
            this.spinAt = {
              ...onField(from, { x: side * leftBy, z: forwardBy, heading: 0 }),
              heading: from.heading + side * turned,
            }
          } else {
            // Round all but on the spot (the author): slowing from the run almost to a stand
            // while it starts turning, turning fastest where it all but stands, and picking up
            // the run again as it comes round — a tiny loop, smooth in pace and in turning.
            const phase = Math.min(1, (t - SPIN_AHEAD_TIME) / loop)
            const pace = SPIN_RUN * Math.cos(Math.PI * phase) ** 2
            // Turning picks up over the first share of it and eases off over the last, steady
            // between: its fastest is little above the average, so its paws can keep up.
            const ramp = SPIN_TURN_RAMP
            // Round as far as brings it facing on again (it came in turned a little out), the
            // turning it came in with fading as its own picks up.
            const carried = this.spinRate * loop * ramp * 0.5
            const steady = (this.spinTurn - carried) / (loop * (1 - ramp))
            const rising = Math.min(1, phase / ramp)
            const k = Math.min(rising, (1 - phase) / ramp)
            const turning =
              steady * k * k * (3 - 2 * k) +
              this.spinRate * (1 - rising * rising * (3 - 2 * rising))
            const at = this.spinAt
            const heading = at.heading + side * turning * dt
            this.spinAt = {
              x: at.x + Math.sin(heading) * pace * dt,
              z: at.z + Math.cos(heading) * pace * dt,
              heading,
            }
          }
          this.dogAim = this.spinAt
          controls.dogAt = inTeam(this.team, this.dogAim)
          this.spunTo = { ...controls.dogAt, heading: 0 }
          this.spunPace = SPIN_RUN - speed
        } else {
          // Out of the loop facing on, at its pace: settling into heel in the team's frame.
          const u = Math.min(1, (t - SPIN_AHEAD_TIME - loop) / SPIN_INTO_HEEL)
          const heel = PLACES[this.dogPlace]
          controls.dogAt = {
            x: this.spunTo.x + (heel.x - this.spunTo.x) * ease(u),
            z: hermite(u, this.spunTo.z, this.spunPace, heel.z, 0, SPIN_INTO_HEEL),
            heading: 0,
          }
        }
        done = t >= SPIN_AHEAD_TIME + loop + SPIN_INTO_HEEL
      } else if (current.dogChanges) {
        if (starting) this.walkingWay = this.side(WALKING_PATHS[current.dogChanges])
        const { path, ends, facesAsPath, ramps = 0 } = this.walkingWay!
        const walked = Math.min(1, (travelled - this.stepStart) / current.walk)
        const u = ramped(walked, ramps)
        const here = path.at(path.length * u)
        const ahead = path.at(Math.min(path.length, path.length * u + 0.01))
        const pace = (ramped(Math.min(1, walked + 0.01), ramps) - u) / 0.01 || 0
        const along = (path.length / current.walk) * Math.max(speed, 0.2) * pace
        const vx = ((ahead.x - here.x) / 0.01) * along
        const vz = ((ahead.z - here.z) / 0.01) * along + speed
        // Facing the way it goes, but turning no faster than its paws can carry it round —
        // where it all but stops (turning back the other way) the way it goes swings at once.
        const wanted = facesAsPath ? here.heading : Math.atan2(vx, vz)
        if (starting) this.walkingDogHeading = this.dogAt.heading
        const most = DOG_MAX_SPIN * WALKING_TURN * dt
        const turn = angleTo(this.walkingDogHeading, wanted)
        this.walkingDogHeading += facesAsPath ? turn : Math.max(-most, Math.min(most, turn))
        controls.dogAt = { x: here.x, z: here.z, heading: this.walkingDogHeading }
        if (done) this.dogPlace = ends
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
      if (starting) this.aroundPath = this.side({ path: PATHS[current.around] }).path
      const path = this.aroundPath!
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
      if (starting) this.dogWay = this.side(DOG_PATHS[current.dogPath])
      const { path, ends, even } = this.dogWay!
      if (starting) {
        this.dogWalked = 0
        // The path starts where the dog usually is; from wherever it really is, the difference
        // fades out over the first stretch of the way.
        const from = path.at(0)
        const at = this.last ? this.dogAt : from
        this.dogPathShift = { x: at.x - from.x, z: at.z - from.z }
      }
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
            DOG_MAX_SPIN /
              Math.max(
                even ? tightestBend(path) / EVEN_HEADROOM : bendAhead(path, this.dogWalked),
                1e-6,
              ),
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
        dogAt: onLegs
          ? shifted(path.at(this.dogWalked), this.dogPathShift, this.dogWalked)
          : undefined,
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
        // Out of a walk, set from the foot the walk's last step landed with.
        const from = current.fromFoot !== undefined ? feet?.[current.fromFoot] : undefined
        if (from) {
          const [nx, nz] = [current.fromFoot ? -0.1 : 0.1, -0.08]
          const h = this.team.heading
          this.footworkBase = {
            x: from.x - (nx * Math.cos(h) + nz * Math.sin(h)),
            z: from.z - (-nx * Math.sin(h) + nz * Math.cos(h)),
            heading: h,
          }
        }
        this.footworkIndex = 0
        this.footworkDwell = 0
        // Where the body stands off the point between its feet (they stand a little apart
        // from exactly side by side): kept as it is, so the body never jumps.
        const over = feet ? bodyOver(feet) : this.team
        this.footRest = feet ? footAhead(feet, this.team) : 0
        const side = this.dogPlace === 'right' ? -1 : 1
        this.footRestOut = feet
          ? Math.max(...feet.map((f) => side * inTeam(this.team, { ...f, heading: 0 }).x))
          : 0
        const dog = onField(this.team, this.dogAt)
        this.frontAim = { x: dog.x, z: dog.z }
        this.frontDog = { x: dog.x, z: dog.z }
        this.frontStart = this.dogAt.z
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
      // The body moves from where it stood to where the feet will have taken it, setting off
      // and slowing down smoothly while the feet step under it, not jumping with each footfall.
      if (starting) {
        this.footworkFrom = { ...this.team }
        const end = [0, 1].map((foot) => {
          const last = current.footwork.findLast((t) => t.foot === foot)
          const now = feet?.[foot]
          if (!last) return now ?? { x: 0, z: 0, yaw: this.team.heading }
          const at = onField(this.footworkBase, { x: last.x, z: last.z, heading: last.yaw })
          return { x: at.x, z: at.z, yaw: at.heading }
        })
        this.footworkTo = onField(bodyOver(end), this.footworkOffset)
        // Walking on from feet still apart, the team goes the way the leading foot points —
        // the full turn — not between that and the foot left behind.
        const then = steps[this.index + 1]
        if (then !== undefined && 'walk' in then)
          this.footworkTo.heading = this.footworkBase.heading + current.footwork.at(-1)!.yaw
        this.footworkTo.heading =
          this.footworkFrom.heading + angleTo(this.footworkFrom.heading, this.footworkTo.heading)
        this.footworkTime = 0
        this.footworkSpeed = speed
        this.footworkDuration = current.footwork.length * STEP_TIME
      }
      this.footworkTime += dt
      const time = Math.min(1, this.footworkTime / this.footworkDuration)
      const glide = ease(time)
      // Walking on straight after the steps, the body does not slow down at their end: it
      // sets off smoothly and is already on its way when the walk takes over.
      const next = steps[this.index + 1]
      const walksOn = next !== undefined && 'walk' in next
      const travel = walksOn ? time * time : glide
      // Turning, the whole body glides — the dog at heel swings round in one smooth go.
      // Stepping straight on or back, it stays over its feet: a body behind a foot stepping
      // ahead would sag over the step.
      const turning = Math.abs(this.footworkTo.heading - this.footworkFrom.heading) > 0.2
      const over =
        feet && !turning && current.fromFoot === undefined
          ? onField(bodyOver(feet), this.footworkOffset)
          : null
      this.team = {
        x: over?.x ?? this.footworkFrom.x + (this.footworkTo.x - this.footworkFrom.x) * travel,
        z: over?.z ?? this.footworkFrom.z + (this.footworkTo.z - this.footworkFrom.z) * travel,
        heading:
          this.footworkFrom.heading + (this.footworkTo.heading - this.footworkFrom.heading) * glide,
      }
      // Out of a walk the body runs on: forward it slows from the walking speed to where the
      // steps take it (critically damped, no going back), aside it glides there.
      if (current.fromFoot !== undefined) {
        const base = this.footworkBase
        const from = inTeam(base, this.footworkFrom)
        const to = inTeam(base, this.footworkTo)
        const t = this.footworkTime
        const a = from.z - to.z
        const b = this.footworkSpeed + OUT_OF_WALK_SETTLE * a
        const z = to.z + (a + b * t) * Math.exp(-OUT_OF_WALK_SETTLE * t)
        const x = from.x + (to.x - from.x) * glide
        this.team = { ...onField(base, { x, z, heading: 0 }), heading: base.heading }
      }
      const moved = Math.hypot(this.team.x - this.footworkFrom.x, this.team.z - this.footworkFrom.z)
      // A dog sitting or lying in front gets up once the handler has moved off — not while
      // the knee of the leg stepping back still comes forward towards its head. A step aside
      // it follows at once ("pes jej následuje"), moving with the handler.
      const last = current.footwork.at(-1)!
      const aside = Math.abs(last.x) > Math.abs(last.z + 0.08)
      const getsUp = aside || moved >= GETS_UP_AFTER
      if (this.dogPlace !== 'front' || this.posture === 'stand' || getsUp) this.posture = 'stand'
      const target = current.footwork[Math.min(this.footworkIndex, current.footwork.length - 1)]!
      const at = onField(this.footworkBase, { x: target.x, z: target.z, heading: target.yaw })
      controls = {
        dog: this.posture === 'stand' ? dogGait(this.pace) : this.posture,
        place: this.dogPlace,
        handler: 'stand',
        footstep: { foot: target.foot, x: at.x, z: at.z, yaw: at.heading },
      }
      // A dog in front keeps its distance from the handler's forward foot, not from the body
      // between the feet: following the handler back, it goes where that foot goes, smoothly
      // (two easings in a row, so its pace changes without a jolt) and on the field — a dog
      // lagging behind stays further off, never closer.
      // A dog at heel keeps its distance from the handler's foot on its side, not from the
      // body between the feet: stepping aside, away from it, it stays put until that foot
      // has moved; towards it, it moves out of the foot's way as the foot comes.
      if ((this.dogPlace === 'left' || this.dogPlace === 'right') && feet && !turning) {
        const side = this.dogPlace === 'left' ? 1 : -1
        // Where that foot is going counts too: the dog makes room as the foot sets off.
        const out = Math.max(
          ...[...feet, at].map((f) => side * inTeam(this.team, { ...f, heading: 0 }).x),
        )
        controls.dogOut = Math.max(0, out - this.footRestOut)
      }
      let followed = true
      // Still sitting or getting up, it stays where it is.
      const onLegs = this.posture === 'stand' && (this.last?.feet.dogOnLegs ?? true)
      if (this.dogPlace === 'front' && feet && !onLegs) {
        controls.dogAt = inTeam(this.team, {
          ...this.frontDog,
          heading: this.team.heading + Math.PI,
        })
        followed = false
      } else if (this.dogPlace === 'front' && feet) {
        // It never backs away: it stays where it is until the handler has moved off, then
        // follows.
        const place = PLACES[this.dogPlace]
        const ahead = Math.max(0, footAhead(feet, this.team) - this.footRest)
        // A little more than the forward foot's lead: that leg's thigh reaches forward too, and
        // the dog's head is at its height.
        const off = Math.min(place.z + ahead * THIGH_LEAD, this.frontStart + moved)
        // Stepping aside it heads straight for where the handler's step ends, keeping in
        // front of the handler as both go, rather than trailing behind and into a leg.
        const aim = onField(aside ? this.footworkTo : this.team, { ...place, z: off })
        const k = 1 - Math.exp(-FRONT_FOLLOWS * dt)
        this.frontAim = {
          x: this.frontAim.x + (aim.x - this.frontAim.x) * k,
          z: this.frontAim.z + (aim.z - this.frontAim.z) * k,
        }
        // …no faster than its paws carry it, sideways least of all.
        const step = {
          x: (this.frontAim.x - this.frontDog.x) * k,
          z: (this.frontAim.z - this.frontDog.z) * k,
        }
        const most = FRONT_DOG_SPEED * dt
        const far = Math.hypot(step.x, step.z)
        const cut = far > most ? most / far : 1
        this.frontDog = { x: this.frontDog.x + step.x * cut, z: this.frontDog.z + step.z * cut }
        controls.dogAt = inTeam(this.team, { ...this.frontDog, heading: aim.heading })
        followed = Math.hypot(aim.x - this.frontDog.x, aim.z - this.frontDog.z) < 0.005
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
      // Done once the last step has landed and a dog following in front has caught up.
      done = this.footworkIndex >= current.footwork.length && followed
      if (done && walksOn && turning) {
        // On at the speed the body has, the way the turn ends (the last steps may land a
        // moment before the turn's last fraction of a degree).
        const way = Math.hypot(
          this.footworkTo.x - this.footworkFrom.x,
          this.footworkTo.z - this.footworkFrom.z,
        )
        this.animator.carryOn((2 * time * way) / this.footworkDuration)
        this.team = { ...this.team, heading: this.footworkTo.heading }
      }
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
        this.turnDogFrom = null
        this.braking = current.radius === 0
        // From the right leg the dog's own ways go the other way round, and so does a turn
        // that goes by the dog's side.
        this.turnBy = this.flipped ? -1 : 1
        if (current.dogRound) this.dogWay = this.side(DOG_PATHS[current.dogRound])
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
      if (current.dogRound && !this.braking) {
        const { path } = this.dogWay!
        const total = (Math.abs(current.turn) * Math.PI) / 180
        controls.dogAt = path.at(path.length * (1 - this.turnLeft / total))
      }
      // Turning about by itself, round its front paws: they stay where they are while its
      // body swings round them, so it ends at the handler's other leg facing the new way.
      // Turning about by itself: from wherever it stands as the handler starts to turn, round
      // the pivot, on the field — never first back to where it ought to have stood.
      if (current.dogTurns && !this.braking) {
        this.turnDogFrom ??= onField(this.team, this.dogAt)
        const from = this.turnDogFrom
        const total = (Math.abs(current.turn) * Math.PI) / 180
        const u = current.dogTurns.seconds
          ? ramped(Math.min(1, this.stepTime / current.dogTurns.seconds), 0.3)
          : ease(1 - this.turnLeft / total)
        const side = this.dogPlace === 'right' ? -1 : 1
        const way = current.dogTurns.way * this.turnBy
        const own = (way * Math.PI * (current.dogTurns.degrees ?? 180) * u) / 180
        const { pivot } = current.dogTurns
        const q = onField(from, { x: side * pivot.x, z: pivot.z, heading: 0 })
        const v = { x: from.x - q.x, z: from.z - q.z }
        // Out of the way early: by the time its rear swings round, it has moved over.
        const outward = (current.dogTurns.out ?? 0) * Math.min(1, 2 * u)
        const aside = onField(from, { x: side * outward, z: 0, heading: 0 })
        this.dogAim = {
          x: q.x + v.x * Math.cos(own) + v.z * Math.sin(own) + aside.x - from.x,
          z: q.z - v.x * Math.sin(own) + v.z * Math.cos(own) + aside.z - from.z,
          heading: from.heading + own,
        }
        controls.dogAt = inTeam(this.team, this.dogAim)
        // Round once on the spot it trots, its paws quick enough to keep up with the turn.
        if ((current.dogTurns.degrees ?? 180) >= 360) controls.dog = 'trot'
      }
    } else {
      done = this.stepTime >= END_PAUSE
    }

    const advanced = this.animator.advance(dt, controls)
    const moved = advanced.travelled - travelled
    // The team coming to a stop: where the dog will stand, so its last steps land there.
    if (controls.handler === 'stand' && !controls.stay && !controls.dogAt && advanced.speed > 0)
      // Easing out at SETTLE_RATE down to the firm stop (`team.ts`).
      controls.dogRest = onField(
        forward(this.team, Math.max(0, advanced.speed - FIRM_STOP) / SETTLE_RATE),
        advanced.place,
      )
    const frameWalked = advanced.walked

    if (current && 'turn' in current) {
      const turn = current.bySide ? current.turn * this.turnBy : current.turn
      const sign = turn > 0 ? -1 : 1 // right = towards −x = heading decreasing
      if (current.radius === 0 && this.braking) {
        this.team = forward(this.team, moved)
      } else if (current.radius === 0) {
        const angle = Math.min((frameWalked - walked) / PIVOT_RADIUS, this.turnLeft)
        this.team = { ...this.team, heading: this.team.heading + sign * angle }
        this.turnLeft -= angle
        this.team = forward(this.team, moved)
      } else {
        // Into the bend gradually: over the first part of the turn only some of the way
        // goes round, the rest straight on, so the turning picks up smoothly.
        const total = (Math.abs(current.turn) * Math.PI) / 180
        const into = Math.min(1, 0.25 + (total - this.turnLeft) / TURN_IN)
        const arc = Math.min(moved * into, this.turnLeft * current.radius)
        // The centre of the arc is to the side the team turns: left = +x of its frame.
        const side = sign * current.radius
        const cx = this.team.x + side * Math.cos(this.team.heading)
        const cz = this.team.z - side * Math.sin(this.team.heading)
        const turned = rotateAbout(this.team, cx, cz, (sign * arc) / current.radius)
        this.team = forward(turned, moved - arc)
        this.turnLeft -= arc / current.radius
      }
      done = this.turnLeft <= 1e-6 && this.stepTime >= (current.dogTurns?.seconds ?? 0)
      // Turned about by itself, the dog is at the handler's other leg; round once, at the same.
      if (done && current.dogTurns && (current.dogTurns.degrees ?? 180) % 360 !== 0)
        this.dogPlace = this.dogPlace === 'right' ? 'left' : 'right'
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
      this.offset = this.aroundPath!.at(frameWalked - this.walkedAtStart)
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
    const body = this.dogBody.follow(this.dogAim ?? onField(this.team, advanced.place), dt, hold)
    this.dogAim = null
    this.dogAt = inTeam(this.team, body)
    // Lying down in front, the body goes back over the forelegs (`TeamAnimator.dogFold`).
    const fold = this.animator.dogFold
    const dog = {
      ...body,
      x: body.x - fold * Math.sin(body.heading),
      z: body.z - fold * Math.cos(body.heading),
    }
    const frame = this.animator.pose(dt, controls, onField(this.team, this.offset), dog)
    frame.dog = { ...frame.dog, ...inTeam(this.team, dog) }
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
      flipped: this.flipped,
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
    // A change of pace, or the dog changing sides, starts the exercise without stopping.
    if (!('walk' in step) || (distance > 0 && (step.pace || step.dogChanges))) break
    distance += step.walk
  }
  return distance
}

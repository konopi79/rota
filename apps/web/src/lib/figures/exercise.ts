import type { DogPosture } from './dog'
import { HANDLER_PACE, HEEL, type HandlerPace } from './handler'
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
  overBar,
  partOf,
  recallToFront,
  recallToHeel,
  runToPlace,
  type Path,
  type PathPoint,
} from './paths'
import { geometry } from '@rota/content'

import { towards, type Course } from './courses'
import { JUMP_WIDTH, LEAP_FROM, LEAP_UNTIL, alongBar, type Bar } from './leap'
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
      /**
       * Into steps taken out of the walk (`fromFoot`) whatever foot comes down there: if the
       * other one does, the right one closes up level with it first — a handler adjusting
       * the step to the card (a course walked through, where the way up is not the script's).
       */
      closeUp?: true
      /** Meanwhile the dog changes sides, behind the handler or ahead across in front. */
      dogChanges?: WalkingDogPath
      /**
       * Leaving the dog on the move (3-310–3-312 "aniž by se zastavil, odkládá psa"): it stops
       * within a body length and takes this position, left there (`dogStays`), while the
       * handler walks on.
       */
      dropsDog?: DogPosture
      /**
       * The dog goes over the jump ahead (2-217, 3-313: "Psovod vysílá psa na překážku … Jakmile
       * pes překoná překážku, psovod velí psa k noze"): out from heel to straight before its
       * middle, over, and back into heel by the time the team has walked this far, metres —
       * the handler walking on all the while.
       */
      dogJumps?: number
      /**
       * The dog left behind is called while the handler runs on (3-323 "za běhu jej přivolává"):
       * it gets up and gallops after them, slowing to their pace as it comes up into heel —
       * the walk ends there, however far it was to go.
       */
      dogChases?: true
    }
  | { stop: true } // the handler stops, the dog stops beside
  | { dog: DogPosture } // the dog changes position, the handler stands
  | { wait: number } // seconds
  | { around: 'dog' } // the handler walks around the dog and back to the base place
  /**
   * The leave cards (2-211 "odkládá psa do pozice sedni a odchází"): the dog stays where it is,
   * in the position it is in, while the handler goes on — until it is called (`recall`) or the
   * handler is back beside it (`backToDog`).
   */
  | { dogStays: true }
  /**
   * The dog called to the standing handler from where it was left (`dogStays`): into the front
   * (`front`, 2-214), or to the left leg (`heel`: round from the front to a handler facing it,
   * 2-216; up from behind to one with their back to it, 2-215). It gets up and runs.
   */
  | {
      /**
       * `halfway`: called into the front, it is stopped on the way — before the mark at two
       * thirds of the distance (3-308, 3-320, 3-321) — and stays there, standing, for the
       * position the next step gives it.
       */
      recall: 'front' | 'heel' | 'halfway'
    }
  /**
   * The handler back to the dog left (2-213 "se k němu vrací a postaví se vedle psa tak, jak
   * tomu bylo u předchozího cviku"): back along the way to where they left it, and turned
   * about there — the dog at heel again, and it goes on from there with the handler.
   */
  | { backToDog: true; pace?: HandlerPace }
  /** (Worked out from `backToDog`.) The handler beside the dog again: it is at heel. */
  | { dogJoins: true }
  /**
   * The dog sent off to a place (3-324 "vysílá psa ke kuželu"): it gets up from heel, runs
   * there, stops standing facing the way it ran, and is left there (`dogStays`). Station frame.
   */
  | { sendTo: { x: number; z: number } }
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
   * The team walks to `walkTo` — a place on the field, the way it faces there — smoothly,
   * however the exercise before left it: the way between two cards of a course walked
   * through (plan R16). The last metres straight on, so it can stop there or walk on into
   * what comes next. `flipped`: as it gets there, the dog is at the other leg than the next
   * exercise's script was written for (`dogStarts`).
   */
  | {
      walkTo: Pose
      /**
       * The way the course plan has the team walk there: straight on along this line, which
       * ends where the exercise starts as the plan has it (`walkTo` may be a little off it,
       * where the exercise's script stops the handler in its square).
       */
      along?: Pose
      pace?: HandlerPace
      flipped?: boolean
      /**
       * The steps lined up the way the next exercise's script has them as it begins (`Phase`):
       * walking in, the handler walks a little faster or slower so that foot lands there.
       */
      phase?: Phase
      /**
       * At a slant all the way (3-301 "psovod šikmo"): bending onto the straight line to the
       * place at once, and off it only just before, to stand square to the card (the author).
       */
      slant?: true
    }
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

/**
 * Where the handler's steps are as an exercise begins walking: the foot that came down last
 * (0 left, 1 right), and how far the team has walked since, metres.
 */
export type Phase = { foot: 0 | 1; since: number }

/** Lining the steps up (`Phase`) the handler walks at most this much faster or slower. */
const LINE_UP_PACE = 0.18

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
/**
 * The fastest a dog can go at `s` along `path` (m/s, at most `top`) and still slow down, at
 * `braking` m/s², for every bend in the next few metres — taking each as fast as it can turn
 * — and to a stand at the path's end.
 */
const slowingFor = (path: Path, s: number, top: number, braking: number) => {
  // To a stand at the end…
  let most = Math.min(top, Math.sqrt(2 * braking * Math.max(0, path.length - s)))
  // …and each bend as fast as it can turn.
  for (let d = 0; d <= SLOWING_AHEAD && s + d < path.length; d += 0.1) {
    const there = DOG_MAX_SPIN / Math.max(bendAhead(path, s + d, 0.1, 0), 1e-6)
    most = Math.min(most, Math.sqrt(there * there + 2 * braking * d))
  }
  return most
}
/** How far ahead, metres, a running dog looks for what it must slow down for. */
const SLOWING_AHEAD = 3

/**
 * Over a jump while the team walks on, the dog runs at the bar faster than the team walks — a
 * jump wants pace — and slows down after it, coming back into heel just as the handler comes
 * up: for each twentieth of the team's way, how far along its own way the dog is (0–1). Its
 * pace along its way is up to `JUMP_PACE` times as fast round the bar (`toBar` metres in).
 */
const JUMP_PACE = 2.2
const jumpPace = (route: Path, toBar: number): number[] => {
  const steps = 200
  const pace = (s: number) => 1 + (JUMP_PACE - 1) * Math.exp(-(((s + toBar) / 1.4) ** 2))
  // Time (in team metres) to each point of the dog's way, at that pace…
  const time = [0]
  for (let i = 1; i <= steps; i++) {
    const s = (route.length * (i - 0.5)) / steps
    time.push(time[i - 1]! + route.length / steps / pace(s))
  }
  // …and for each twentieth of it, how far along the dog's way.
  const total = time[steps]!
  const out: number[] = []
  for (let k = 0; k <= 20; k++) {
    const t = (total * k) / 20
    let i = 1
    while (i < steps && time[i]! < t) i++
    const f = (t - time[i - 1]!) / (time[i]! - time[i - 1]! || 1)
    out.push((i - 1 + f) / steps)
  }
  return out
}
/** Where along a table of twentieths (`jumpPace`) a share `u` (0–1) is. */
const along = (table: number[], u: number) => {
  const x = Math.min(1, Math.max(0, u)) * (table.length - 1)
  const i = Math.min(table.length - 2, Math.floor(x))
  return table[i]! + (table[i + 1]! - table[i]!) * (x - i)
}

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
/**
 * Called from where it was left, the dog runs in at this pace, m/s, and brakes this hard,
 * m/s² — a border collie on a recall of a few metres.
 */
const RECALL_SPEED = 3.2
/**
 * Called from a step or two away (2-230, 2-231) the dog does not run: it walks over, no
 * faster than this, m/s (the author) — slow enough that it walks rather than trots.
 */
const SHORT_RECALL = 1.5
const RECALL_WALK = 0.7
const RECALL_BRAKING = 4
/** Back beside the dog left, the handler stands this much further from it than at heel, metres. */
const BESIDE_DOG_ROOM = 0.04
/** The handler's command to stay, seconds. */
const STAY_TIME = 0.6
/** Stopped on its way in (`halfway`), the dog has run this share of the way to the front. */
export const HALFWAY = 0.45
/** Sent off to a place (`sendTo`), the dog stops this far short of it, metres. */
const SEND_SHORT = 0.6
/**
 * Called while the handler runs on (`dogChases`): how quickly the dog picks up its pace, m/s²;
 * how quickly it turns to its way, 1/s; and within this far of heel it is there, metres.
 */
const CHASE_PICK_UP = 6
const CHASE_TURN = 6
const CHASE_CAUGHT = 0.12
/** Left on the move, the dog stops this hard, m/s² — within a body length from a walk. */
const DROP_BRAKING = 2.5
/** Running in, over its last this many metres its strides land where it will stand. */
const LAST_STRIDES = 0.4
/** Faster than this the dog gallops, m/s; slowing down, it trots again below the second. */
const GALLOP_FROM = 2.2
const GALLOP_UNTIL = 1.8

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
  /**
   * Marks on the ground, in the station's frame: across the dog's way (the two thirds of a
   * recall with a down), or along the team's (`lengthwise`: 3-313's line the handler keeps
   * beyond).
   */
  marks?: { x: number; z: number; lengthwise?: true }[]
  /** Bar jumps, in the station's frame: the bar's middle, the bar across the team's way. */
  jumps?: { x: number; z: number }[]
  /**
   * Two cards played one after the other — a leave card and the follow-up the dog is called
   * or joined by (plan R17): each card's own exercise, and how far on (metres, straight
   * ahead) its handler stops from this exercise's station. Their cards stand where their own
   * exercises have them; `code` is the card this one is shown for, `pairedWith` the other.
   */
  parts?: { exercise: Exercise; at: number; aside?: number }[]
  pairedWith?: string
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

/**
 * The card stands on the field, in the frame of the exercise's station: its card and its
 * supplementary card, or each part's (`parts`) where that part's handler stops.
 */
/** A place in a part's frame (`parts`) in the pair's: as far on, and aside. */
const inPair = <T extends { x: number; z: number }>(
  p: T,
  part: NonNullable<Exercise['parts']>[number],
): T => ({ ...p, x: p.x + (part.aside ?? 0), z: p.z + part.at })

export const standsOf = (exercise: Exercise): { code: string; x: number; z: number }[] => {
  if (exercise.parts)
    return exercise.parts.flatMap((part) => standsOf(part.exercise).map((s) => inPair(s, part)))
  const d0 = supplementaryPlace(exercise)
  return [
    { code: exercise.code, ...cardPlace(exercise) },
    ...(d0 && exercise.supplementary ? [{ code: exercise.supplementary, ...d0 }] : []),
  ]
}

/** Where each exercise space is (`exerciseSpace`), in the frame of the exercise's station. */
export const spacesOf = (exercise: Exercise): { x: number; z: number }[] =>
  exercise.parts
    ? exercise.parts.flatMap((part) => spacesOf(part.exercise).map((s) => inPair(s, part)))
    : [exerciseSpace(exercise)]

/** The marks on the ground (`marks`), in the frame of the exercise's station — a pair's too. */
export const marksOf = (exercise: Exercise): { x: number; z: number; lengthwise?: true }[] =>
  exercise.parts
    ? exercise.parts.flatMap((part) => marksOf(part.exercise).map((s) => inPair(s, part)))
    : (exercise.marks ?? [])

/** The jumps (`jumps`), in the frame of the exercise's station — a pair's too. */
export const jumpsOf = (exercise: Exercise): { x: number; z: number }[] =>
  exercise.parts
    ? exercise.parts.flatMap((part) => jumpsOf(part.exercise).map((s) => inPair(s, part)))
    : (exercise.jumps ?? [])

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

  /**
   * How far the body is behind its target along the way the target goes — a body that has run
   * on a little past it is not behind — metres (turning: at the end of a dog's body).
   */
  get behind() {
    if (!this.at || !this.target) return 0
    const dx = this.target.x - this.at.x
    const dz = this.target.z - this.at.z
    const v = Math.hypot(this.targetVelocity.x, this.targetVelocity.z)
    const along =
      v > 0.1 ? (dx * this.targetVelocity.x + dz * this.targetVelocity.z) / v : Math.hypot(dx, dz)
    return Math.hypot(Math.max(0, along), 0.25 * angleTo(this.at.heading, this.target.heading))
  }
  private targetVelocity = { x: 0, z: 0 }

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
    this.targetVelocity = { x: tv.x, z: tv.z }
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
  private dogGallops = false
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
  /**
   * The dog left where it is (`dogStays`): where it is on the field, and in what position. It
   * stays there whatever the handler does, until called or joined.
   */
  private left: Pose | null = null
  private leftPosture: DogPosture = 'sit'
  /** The way the dog faced as it was left. */
  private leftWay = 0
  /**
   * Left on the move (`dropsDog`): lying down it keeps its front paws where they are, its body
   * going down back over them — the paws stay where it stopped.
   */
  private leftOnTheMove = false
  /** The handler beside the dog left again: it goes with them once they walk on. */
  private joining = false
  /** The dog going its own way at the pace of a recall (`recall`), not a trot. */
  private recalling = false
  /** …and how fast it goes at most: running in, or walking over from close by. */
  private recallSpeed = RECALL_SPEED
  /** Stopped on its way in (`halfway`): it is left where it stops. */
  private stoppedHalfway = false
  /** The jumps on the field (this exercise's frame), their bars across the team's way. */
  private readonly bars: { x: number; z: number }[]
  /**
   * Over a jump while the team walks on (`dogJumps`): the dog's way on the field, and from how
   * far the team had walked to how far it will have walked as the dog comes back into heel.
   */
  private jumpRun: { route: Path; from: number; over: number; pace: number[] } | null = null
  /**
   * Called while the handler runs on (`dogChases`): where the dog's way has got to on the field
   * (its body follows) and how fast it goes.
   */
  private chasing: { at: Pose | null; speed: number } | null = null
  /** Sent off to a place (`sendTo`): it is left there once it stops. */
  private sentOff = false
  /** Left on the move (`dropsDog`): where it began to stop, how far it has come and how fast. */
  private dropping: { from: Pose; went: number; speed: number; posture: DogPosture } | null = null

  /** The exercise's steps, a way to a place (`walkTo`) worked out as it comes. */
  private readonly steps: ExerciseStep[]

  /** The walk ended on the other foot than the steps out of it start from (`closeUp`). */
  private closingUp = false
  /**
   * Lining the steps up on the way to a place (`walkTo.phase`): how far it is, from how far
   * walked, and the steps that go there.
   */
  private lining: (Phase & { total: number; from: number; until: number }) | null = null
  /** The handler's last footfalls: which foot, and how far the team had walked then. */
  private footfalls: { foot: number; at: number }[] = []

  /** The last metres of a way to a place, straight on into it (`walkTo`). */
  private static readonly WALK_IN = 1.2
  /**
   * Onto the plan's line within this far and as far again as it is off it, metres; over to
   * where the exercise starts within `LINE_UP` m before getting there.
   */
  private static readonly JOIN = geometry.HAIRPIN_JOIN
  /** Further off the plan's line than this, metres (beside the way in), the team joins it first. */
  private static readonly FAR_OFF = 0.6
  private static readonly LINE_UP = 1.5
  /** At a slant (`slant`), onto the line and off it round corners this far on, metres. */
  private static readonly SLANT_BEND = 0.4

  constructor(private readonly exercise: Exercise) {
    this.steps = [...exercise.steps]
    const station = stationOf(exercise)
    this.bars = jumpsOf(exercise).map((j) => ({ x: j.x, z: station + j.z }))
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

  /**
   * A way to a place (`walkTo`) as a bend from where the team is to a point the last metres
   * short of it, then straight on into it: those metres a walk, so the team can stop there.
   */
  private expandWalkTo() {
    const step = this.steps[this.index] as Extract<ExerciseStep, { walkTo: Pose }>
    const to = inTeam(this.team, step.walkTo)
    const heading = angleTo(0, to.heading)
    const ahead = to.x * Math.sin(heading) + to.z * Math.cos(heading)
    // Straight on into it at least as far as the team needs to come to a stop from its pace.
    const braking = (this.last?.speed ?? 0) / SETTLE_RATE + 0.6
    const walkIn = step.slant ? braking : Math.max(ExercisePlayer.WALK_IN, braking)
    const last = Math.max(0.3, Math.min(walkIn, ahead - 0.5))
    const end = { x: to.x - last * Math.sin(heading), z: to.z - last * Math.cos(heading), heading }
    // Onto the plan's line first (however the last exercise left the team: an arc's end, beside
    // the way in), straight on along it, and over to where the exercise starts only just
    // before the card — as a handler lines up at it.
    const through: { x: number; z: number; heading: number; tight?: boolean }[] = [end]
    if (step.along) {
      const line = inTeam(this.team, step.along)
      const h = angleTo(0, line.heading)
      const [c, s] = [Math.cos(h), Math.sin(h)]
      // Along the line: how far the team is from its end, and how far off it.
      const back = -(-line.x * s - line.z * c)
      const off = -line.x * c + line.z * s
      const onLine = (fromEnd: number) => ({
        x: line.x - fromEnd * s,
        z: line.z - fromEnd * c,
        heading: h,
      })
      const toEnd = Math.max(0, -(end.x - line.x) * s - (end.z - line.z) * c)
      const lineUp = toEnd + ExercisePlayer.LINE_UP
      // Onto the line the way the plan has it (`geometry.wayTo`): over in a short bend, at
      // the latest just before the place — then straight on, and over to where the exercise
      // starts only at the end, if there is room for that.
      const joined = Math.max(back - (ExercisePlayer.JOIN + Math.abs(off)), toEnd + 0.3)
      const farOff = Math.abs(off) > ExercisePlayer.FAR_OFF
      if (joined > lineUp + 0.3)
        through.unshift({ ...onLine(joined), tight: farOff }, onLine(lineUp))
      else if (farOff && joined < back - 0.3) through.unshift({ ...onLine(joined), tight: true })
    }
    // At a slant: onto the straight line to the place at once, off it only just before — round
    // a corner at each end, each bend even either side of its corner (no swinging out).
    if (step.slant) {
      const bend = ExercisePlayer.SLANT_BEND
      const [c, s] = [Math.cos(end.heading), Math.sin(end.heading)]
      const into = { x: end.x - bend * s, z: end.z - bend * c }
      const h = Math.atan2(into.x, into.z - bend)
      through.splice(
        0,
        1,
        { x: bend * Math.sin(h), z: bend + bend * Math.cos(h), heading: h, tight: true },
        { x: into.x - bend * Math.sin(h), z: into.z - bend * Math.cos(h), heading: h },
        { ...end, tight: true },
      )
    }
    // A little off and no room to join first: straight on as the team faces, over to the place
    // only at the end.
    if (through.length === 1 && Math.abs(end.heading) < 0.2) {
      const straight = end.z - ExercisePlayer.LINE_UP
      if (straight > 0.3) through.unshift({ x: 0, z: straight, heading: 0 })
    }
    const { caption, pace } = step
    if (step.flipped !== undefined) this.flipped = step.flipped
    const next = this.steps[this.index + 1]
    const intoSteps = next && 'footwork' in next && next.fromFoot !== undefined
    const way = towards(...through)
    this.lining = step.phase
      ? {
          ...step.phase,
          total: way.path.length + last,
          from: this.last?.travelled ?? 0,
          until: this.index + 1,
        }
      : null
    this.steps.splice(
      this.index,
      1,
      { course: way, parts: [0, through.length], caption, ...(pace && { pace }) },
      { walk: last, caption, ...(pace && { pace }), ...(intoSteps && { closeUp: true }) },
    )
  }

  /** The jump the dog is coming to or going over now, its bar's way the way the dog goes. */
  private barAhead(): Bar | undefined {
    const dog = onField(this.team, this.dogAt)
    for (const b of this.bars) {
      const bar = { ...b, heading: Math.cos(dog.heading) >= 0 ? 0 : Math.PI }
      const a = alongBar(bar, dog)
      const side = Math.abs(dog.x - b.x)
      if (a >= LEAP_FROM - 0.2 && a < LEAP_UNTIL && side < JUMP_WIDTH / 2) return bar
    }
    return undefined
  }

  /** The jump between a dog at `dog` and a handler at `handler`, if the way crosses its bar. */
  private barBetween(dog: Pose, handler: Pose) {
    return this.bars
      .map((b) => ({ ...b, heading: handler.z > dog.z ? 0 : Math.PI }))
      .find((b) => {
        const t = (b.z - dog.z) / (handler.z - dog.z || 1e-9)
        const x = dog.x + (handler.x - dog.x) * t
        return t > 0 && t < 1 && Math.abs(x - b.x) < JUMP_WIDTH
      })
  }

  /**
   * How much faster or slower than now to walk (a share: 1 as now; 0 nothing to line up) so
   * that the foot `aim.foot` comes down last before the place, `aim.since` short of it: steps
   * keep their time, so a step is as much longer as the walk is faster. Of the footfalls still
   * to come, the one with that foot that asks the least change; worked out again every frame.
   */
  private lineUp(aim: NonNullable<typeof this.lining>, travelled: number, speed: number): number {
    const [prev, last] = this.footfalls.slice(-2)
    const toGo = aim.total - (travelled - aim.from)
    if (!prev || !last || speed < 0.4 || toGo < 0.4) return 0
    const step = last.at - prev.at
    if (step < 0.1) return 0
    // From the last footfall to the place, the steps to fit in, with the foot coming last.
    const span = toGo + (travelled - last.at) - aim.since
    let best = 1
    for (let n = 1; n <= Math.ceil(span / step) + 2; n++) {
      if ((n % 2 === 0 ? last.foot : 1 - last.foot) !== aim.foot) continue
      const scale = span / n / step
      if (Math.abs(scale - 1) < Math.abs(best - 1) || best === 1) best = scale
    }
    return best
  }

  /** A way of the dog's own, or the handler's round the dog, as it goes now (`flipped`). */
  private side<T extends { path: Path; ends?: TeamControls['place'] }>(way: T): T {
    if (this.dogPlace === 'front') this.flipped = false
    if (!this.flipped) return way
    return { ...way, path: mirrored(way.path), ...(way.ends && { ends: otherSide(way.ends) }) }
  }

  /**
   * Back to the dog left (`backToDog`): to where the handler stood as they left it — the dog at
   * heel from there — facing it, then turned about there to the right (the author), the dog at
   * heel again.
   */
  private expandBackToDog() {
    const step = this.steps[this.index] as Extract<ExerciseStep, { backToDog: true }>
    // Beside the dog the way the team faced as it left it — the course's way, whichever way the
    // dog came to face since (stopped on its way in, 3-320).
    const dog = { ...this.left!, heading: this.leftWay }
    const heel = PLACES[this.dogPlace]
    // A little further out than at heel: turning about beside a dog lying down, the handler's
    // feet keep off it (the dog closes up as the team walks on).
    const out = Math.sign(heel.x) * BESIDE_DOG_ROOM
    const base = onField(dog, { x: -heel.x - out, z: -heel.z, heading: 0 })
    const { caption, pace } = step
    this.steps.splice(
      this.index,
      1,
      { walkTo: { ...base, heading: dog.heading + Math.PI }, caption, ...(pace && { pace }) },
      { stop: true, caption: 'backAtDog' },
      { turn: 180, radius: 0, caption: 'turnBesideDog' },
      // The feet come to rest side by side after the turn.
      { wait: 0.8, caption: 'turnBesideDog' },
      { dogJoins: true, caption: 'basePosition' },
    )
  }

  step(dt: number): ExerciseFrame {
    if (this.steps[this.index] && 'backToDog' in this.steps[this.index]!) this.expandBackToDog()
    // The way to a place, worked out from where the team is as it sets off.
    if (this.steps[this.index] && 'walkTo' in this.steps[this.index]!) this.expandWalkTo()
    // Out of the walk on the other foot: that one closes up level first (`closeUp`).
    const stepping = this.steps[this.index]
    if (this.closingUp && stepping && 'footwork' in stepping && stepping.fromFoot !== undefined) {
      const foot = stepping.fromFoot
      this.steps[this.index] = {
        ...stepping,
        fromFoot: foot ? 0 : 1,
        footwork: [{ foot, x: foot ? -0.1 : 0.1, z: -0.08, yaw: 0 }, ...stepping.footwork],
      }
      this.closingUp = false
    }
    const steps = this.steps
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
    // …and gallops when it runs in, called (`recall`).
    if (this.recalling && dogSpeed > GALLOP_FROM) this.dogGallops = true
    else if (!this.recalling || dogSpeed < GALLOP_UNTIL) this.dogGallops = false
    // Called from close by, it walks all the way.
    const walksOver = this.recalling && this.recallSpeed === RECALL_WALK
    const dogGait = (_pace: HandlerPace) =>
      this.dogGallops ? 'gallop' : this.dogTrots && !walksOver ? 'trot' : 'walk'
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
        const landedFoot = (i: number) => {
          const foot = this.last?.feet.handler[i]
          return foot !== undefined && foot.swing === null && foot.stance < 0.15
        }
        done = (toGo <= 0.3 && landedFoot(next.fromFoot)) || toGo < -1
        if (!done && current.closeUp && toGo <= 0.1 && landedFoot(1 - next.fromFoot)) {
          done = true
          this.closingUp = true
        }
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
      // A dog left where it is takes the position there (3-309 "na dálku").
      if (this.left) this.leftPosture = current.dog
      controls = { ...controls, dog: current.dog }
      done = this.stepTime >= POSTURE_TIME
    } else if (current && 'wait' in current) {
      done = this.stepTime >= current.wait
    } else if (current && 'dogStays' in current) {
      if (starting) {
        this.left = onField(this.team, this.dogAt)
        this.leftPosture = this.posture
        this.leftWay = this.left.heading
      }
      done = this.stepTime >= STAY_TIME
    } else if (current && 'dogJoins' in current) {
      this.joining = true
      done = true
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
    } else if (current && ('dogPath' in current || 'recall' in current || 'sendTo' in current)) {
      if (starting && 'sendTo' in current) {
        // Off from heel to stop by the place, facing the way it runs.
        const station = stationOf(this.exercise)
        const to = inTeam(this.team, {
          x: current.sendTo.x,
          z: station + current.sendTo.z,
          heading: 0,
        })
        const at = this.dogAt
        const heading = Math.atan2(to.x - at.x, to.z - at.z)
        const stop = {
          x: to.x - SEND_SHORT * Math.sin(heading),
          z: to.z - SEND_SHORT * Math.cos(heading),
        }
        const path = runToPlace(at, stop, heading)
        this.dogWay = { path, ends: this.dogPlace }
        this.sentOff = true
        this.recalling = true
        this.recallSpeed = path.length < SHORT_RECALL ? RECALL_WALK : RECALL_SPEED
      } else if (starting && 'recall' in current) {
        // Called, from where it was left: it gets up there first, then runs in.
        const at = inTeam(this.team, this.left!)
        const kind = current.recall
        const rest = (from: PathPoint) =>
          kind === 'heel' ? recallToHeel(from) : recallToFront(from)
        // A jump between the dog and the handler: it comes over it (2-218, 3-314).
        const bar = this.barBetween(this.left!, this.team)
        const front = bar ? overBar(at, inTeam(this.team, bar), rest) : rest(at)
        const path = kind === 'halfway' ? partOf(front, front.length * HALFWAY) : front
        this.dogWay = { path, ends: kind === 'heel' ? 'left' : 'front' }
        this.stoppedHalfway = current.recall === 'halfway'
        this.leftPosture = 'stand'
        this.recalling = true
        this.recallSpeed = path.length < SHORT_RECALL ? RECALL_WALK : RECALL_SPEED
      } else if (starting && 'dogPath' in current) {
        this.dogWay = this.side(DOG_PATHS[current.dogPath])
        this.recalling = false
      }
      const { path, ends, even } = this.dogWay!
      if (starting) {
        this.dogWalked = 0
        // The path starts where the dog usually is; from wherever it really is, the difference
        // fades out over the first stretch of the way.
        const from = path.at(0)
        const at = this.last ? this.dogAt : from
        this.dogPathShift = this.recalling ? { x: 0, z: 0 } : { x: at.x - from.x, z: at.z - from.z }
      }
      const left = path.length - this.dogWalked
      // The dog gets up first (from a sit in front), then trots off, slows into tight bends
      // and comes to a stand at the end.
      const onLegs = this.last?.feet.dogOnLegs ?? true
      // Called from where it was left, it stays put there until it is up.
      if (this.recalling && onLegs) this.left = null
      // Its body follows only as fast as its paws can carry it: as it falls behind, the path
      // eases off and waits for it. (Running in, a body that has run on a hair past it is not
      // behind.)
      const lag = this.recalling ? this.dogBody.behind : this.dogBody.lag
      const keepingUp = Math.min(1, Math.max(0, (DOG_FALLS_BEHIND - lag) / (DOG_FALLS_BEHIND / 2)))
      // Going on from walking at heel while the handler stops, the dog keeps its pace over the
      // ground: along its path only as fast as the team no longer carries it.
      const wanted = !onLegs
        ? 0
        : this.recalling
          ? // Running in, it slows down in time for each bend ahead and for where it stops.
            keepingUp *
            Math.min(
              Math.max(0, this.recallSpeed - speed),
              slowingFor(path, this.dogWalked, this.recallSpeed, RECALL_BRAKING),
            )
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
        // Running in, its last strides land where it will stand, not past it at the handler.
        ...(this.recalling &&
          this.recallSpeed === RECALL_SPEED &&
          left < LAST_STRIDES && { dogRest: onField(this.team, path.at(path.length)) }),
      }
      done = this.dogWalked >= path.length && this.dogBody.lag < DOG_ARRIVED
      if (done) {
        this.dogPlace = this.stoppedHalfway ? this.dogPlace : ends
        this.dogPathSpeed = 0
        this.recalling = false
        // Sent off, it is left where it stopped, standing.
        if (this.sentOff) {
          this.left = onField(this.team, this.dogAt)
          this.leftPosture = 'stand'
          this.leftWay = this.team.heading
          this.sentOff = false
        }
        // Stopped on its way in, it is left there.
        if (this.stoppedHalfway) {
          this.left = onField(this.team, this.dogAt)
          this.leftPosture = 'stand'
          this.stoppedHalfway = false
        }
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
        if (then !== undefined && ('walk' in then || 'walkTo' in then))
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
      const walksOn = next !== undefined && ('walk' in next || 'walkTo' in next)
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

    // Over a jump while the team walks on: the dog's way, as far along as the team has walked.
    if (current && 'walk' in current && current.dogJumps && starting) {
      const from = onField(this.team, this.dogAt)
      const bar = this.bars.find((b) => alongBar({ ...b, heading: this.team.heading }, from) < 0)!
      const end = onField(forward(this.team, current.dogJumps), PLACES[this.dogPlace])
      const route = overBar(from, { ...bar, heading: this.team.heading }, (past) =>
        runToPlace(past, end, end.heading),
      )
      this.jumpRun = {
        route,
        from: travelled,
        over: current.dogJumps,
        pace: jumpPace(route, alongBar({ ...bar, heading: this.team.heading }, from)),
      }
    }
    if (this.jumpRun) {
      const { route, from, over, pace } = this.jumpRun
      const u = Math.min(1, (travelled - from) / over)
      const at = route.at(route.length * along(pace, u))
      controls = { ...controls, dogAt: inTeam(this.team, at) }
      this.dogAim = at
      if (u >= 1) this.jumpRun = null
    }
    // Called while the handler runs on: up, and after them at a gallop — slowing to their pace
    // as it comes up, so it falls into heel — then the walk is over.
    if (current && 'walk' in current && current.dogChases && starting) {
      this.chasing = { at: null, speed: 0 }
      this.leftPosture = 'stand'
      this.recalling = true
      this.recallSpeed = RECALL_SPEED
    }
    if (this.chasing && current && 'walk' in current) {
      const onLegs = this.last?.feet.dogOnLegs ?? true
      done = false
      if (onLegs) {
        this.left = null
        const c = this.chasing
        const dog = (c.at ??= onField(this.team, this.dogAt))
        const heel = onField(this.team, PLACES[this.dogPlace])
        const [dx, dz] = [heel.x - dog.x, heel.z - dog.z]
        const far = Math.hypot(dx, dz)
        c.speed = Math.min(
          RECALL_SPEED,
          c.speed + CHASE_PICK_UP * dt,
          speed + Math.sqrt(2 * RECALL_BRAKING * far),
        )
        const go = Math.min(far, c.speed * dt)
        const way = Math.atan2(dx, dz)
        const at = {
          x: dog.x + (dx / (far || 1)) * go,
          z: dog.z + (dz / (far || 1)) * go,
          heading: dog.heading + angleTo(dog.heading, way) * Math.min(1, CHASE_TURN * dt),
        }
        c.at = at
        controls = { ...controls, dogAt: inTeam(this.team, at) }
        this.dogAim = at
        if (far < CHASE_CAUGHT) {
          this.chasing = null
          this.recalling = false
          done = true
        }
      }
    }
    // Coming to a jump, the dog leaps over its bar.
    const leap = this.barAhead()
    if (leap) controls = { ...controls, dogLeap: leap }

    // Left on the move, the dog stops along the way it goes, within a body length, and is left
    // there in its position while the handler walks on.
    if (current && 'walk' in current && current.dropsDog && starting)
      this.dropping = {
        from: onField(this.team, this.dogAt),
        went: 0,
        speed: Math.max(speed, 0.5),
        posture: current.dropsDog,
      }
    if (this.dropping) {
      const d = this.dropping
      d.speed = Math.max(0, d.speed - DROP_BRAKING * dt)
      d.went += d.speed * dt
      const at = forward(d.from, d.went)
      if (d.speed === 0) {
        this.left = at
        this.leftPosture = d.posture
        this.leftWay = at.heading
        this.leftOnTheMove = true
        this.dropping = null
      } else {
        controls = { ...controls, dogAt: inTeam(this.team, at) }
        this.dogAim = at
      }
    }

    // A dog left where it is stays there in its position, whatever the handler does — until
    // the handler, back beside it, walks on with it.
    if (this.left && this.joining && controls.handler !== 'stand') {
      this.left = null
      this.joining = false
    }
    if (!this.left) this.leftOnTheMove = false
    if (this.left) {
      this.posture = this.leftPosture
      controls = {
        ...controls,
        dog: this.leftPosture,
        dogAt: inTeam(this.team, this.left),
        ...(this.leftOnTheMove && { foldBack: true }),
      }
      this.dogAim = this.left
    }

    if (this.lining && this.index > this.lining.until) this.lining = null
    if (this.lining) {
      // The speed that lines the steps up: as a share of the pace, and — slowing into what
      // comes next (a bend, steps out of the walk) — of the speed it slows to.
      const wanted = speed * this.lineUp(this.lining, travelled, speed)
      if (wanted > 0) {
        const within = (to: number) =>
          Math.max(to * (1 - LINE_UP_PACE), Math.min(to * (1 + LINE_UP_PACE), wanted))
        const pace = HANDLER_PACE[this.pace].speed
        controls.paceScale = within(pace) / pace
        if (controls.maxSpeed !== undefined) controls.maxSpeed = within(controls.maxSpeed)
      }
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
    // The handler's footfalls, as each foot comes down.
    frame.feet.handler.forEach((foot, i) => {
      const before = this.last?.feet.handler[i]
      if (before?.swing && !foot.swing) {
        this.footfalls = [...this.footfalls.slice(-2), { foot: i, at: frame.travelled }]
      }
    })
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
      finished: this.index > this.steps.length,
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
    if (
      !('walk' in step) ||
      (distance > 0 && (step.pace || step.dogChanges || step.dropsDog || step.dogJumps))
    )
      break
    distance += step.walk
  }
  return distance
}

import {
  endsStatic,
  finishSide,
  getCard,
  paceAfter,
  type Card,
  type Deck,
  type DeckEntry,
  type Pace,
  type RoClass,
  type Side,
} from '@rota/content'

import {
  cardPlace,
  ExercisePlayer,
  stationOf,
  supplementaryPlace,
  type Exercise,
  type ExerciseStep,
  type Phase,
  type Pose,
} from './exercise'
import { EXERCISES, RIGHT_EXERCISES, RIGHT_PARTS, RIGHT_SIDE_CARDS } from './exercises'
import { FOLLOW_UP_PARTS, LEAVE_PARTS } from './leave-exercises'
import { JUMP_WIDTH } from './leap'
import { onField, PLACES } from './team'

/**
 * A course walked through in animation (plan R16): the team walks from the start to each
 * card of a course laid out on the field (R14), performs its exercise there — the card's own
 * animation, its way up and its way on left out — and goes on to the finish. One script for
 * the `ExercisePlayer`, in the frame of where the team sets off (a little before the start
 * line, facing in), and what stands on the field in the same frame.
 */
export type Walkthrough = {
  exercise: Exercise
  /** The field's corners (its edge, as drawn on the plan). */
  field: { corners: [Pose, Pose, Pose, Pose] }
  start: Pose
  finish: Pose
  /** The start and finish cards, at their lines right of the team (it passes them on the left). */
  startCard: Pose
  finishCard: Pose
  /** The mark "R" beside the start card, for a course that starts with the dog on the right. */
  startMark?: Pose
  /** Each card: where its exercise starts, its card (and D0 card), cones and bowls. */
  stations: Station[]
  /**
   * Where the walkthrough starts from (`from`, or the leave card before it when that card
   * follows one: its dog has to be left first).
   */
  from: number
}

export type Station = {
  /** Index into the deck's entries. */
  index: number
  code: string
  supplementary?: string
  /** Where the handler starts the exercise, the way the team faces. */
  at: Pose
  card: Pose
  d0?: Pose
  cones: Pose[]
  bowls: Pose[]
  /** Jumps (the bar across `heading`) and marks on the ground (`lengthwise`: along the way). */
  jumps: Pose[]
  marks: (Pose & { lengthwise?: true })[]
  /** The step of `Walkthrough.exercise` the way to this card starts with. */
  firstStep: number
  /** …and the step its exercise starts with. */
  exerciseStep: number
}

/** The plan is drawn x right, y down, headings clockwise from up (degrees); the scenes have +x
 * to the handler's left when facing +z, headings turning +z towards +x (radians). */
const fromPlan = (p: { x: number; y: number; heading?: number }): Pose => ({
  x: -p.x,
  z: -p.y,
  heading: (-(p.heading ?? 0) * Math.PI) / 180,
})

/** A place in the frame of `base` (the inverse of `onField`). */
const within = (base: Pose, p: Pose): Pose => {
  const dx = p.x - base.x
  const dz = p.z - base.z
  const c = Math.cos(base.heading)
  const s = Math.sin(base.heading)
  return { x: c * dx - s * dz, z: s * dx + c * dz, heading: p.heading - base.heading }
}

/** Going on past a jump, the handler is this far past it before turning off, metres. */
const PAST_THE_JUMP = 1

/** Where the team sets off: this far before the start line, metres, walking in. */
const RUN_UP = 2
/**
 * Past the finish line it walks on this far and stops, metres — less where something stands
 * closer than `RUN_OUT_CLEAR` to where it would stop.
 */
const RUN_OUTS = [1.5, 1, 0.5]
const RUN_OUT_CLEAR = 1.2
/**
 * The start and finish cards at their lines, right of the team, which passes them on the left
 * as it does every card (+x is the team's left): this far from the handler, or from the dog
 * walking on the right; further out, the start's mark "R".
 */
const LINE_CARD = 0.75
const MARK_BESIDE = 0.6
const besideLine = (side: Side, further = 0): Pose => ({
  x: -(LINE_CARD + further + (side === 'right' ? -PLACES.right.x : 0)),
  z: 0,
  heading: 0,
})

/**
 * Which animation a deck's card plays: with the dog on the side the course has it, with its
 * D0 card, after the pace the course brings it in — or `undefined` if there is none.
 */
export function animationOf(entry: DeckEntry): Exercise | undefined {
  const right = entry.side === 'right'
  if (right && !RIGHT_SIDE_CARDS.includes(entry.code)) return undefined
  // A leave card and its follow-up each play their own part, the dog left in between.
  const parts = (right ? RIGHT_PARTS : [...LEAVE_PARTS, ...FOLLOW_UP_PARTS]).filter(
    (e) => e.code === entry.code,
  )
  if (parts.length) return parts.find((e) => e.supplementary === entry.supplementary) ?? parts[0]
  const variants = (right ? RIGHT_EXERCISES : EXERCISES).filter((e) => e.code === entry.code)
  if (entry.supplementary) return variants.find((e) => e.supplementary === entry.supplementary)
  if (variants.some((e) => e.fromPace)) {
    return variants.find((e) => e.fromPace === entry.pace) ?? variants[0]
  }
  return variants[0]
}

export { canWalkThrough } from './animated'

/** How many of an exercise's first steps are its way up to the card (`stationOf`). */
function wayUp(exercise: Exercise): number {
  const station = stationOf(exercise)
  let walked = 0
  let first = 0
  for (const step of exercise.steps) {
    if (!('walk' in step) || walked >= station - 1e-9) break
    walked += step.walk
    first++
  }
  return first
}

const phases = new WeakMap<Exercise, Phase | null>()

/**
 * Where the handler's steps are as the exercise begins, in its own animation — the dog's ways
 * round the handler are set to miss the feet as they fall there, coming to a stand which foot
 * closes up decides how the team stands, and steps out of the walk start on a set foot
 * (`fromFoot`; `closeUp` makes do where the steps do not come out right). Played once and
 * kept.
 */
function phaseOf(exercise: Exercise): Phase | null {
  const known = phases.get(exercise)
  if (known !== undefined) return known
  const first = wayUp(exercise)
  let phase: Phase | null = null
  {
    const player = new ExercisePlayer(exercise)
    let frame = player.step(0)
    let last: { foot: 0 | 1; at: number } | null = null
    while (!frame.finished && frame.stepIndex < first) {
      const before = frame.feet.handler
      frame = player.step(1 / 60)
      frame.feet.handler.forEach((foot, i) => {
        if (before[i]?.swing && !foot.swing) last = { foot: i as 0 | 1, at: frame.travelled }
      })
    }
    if (last) {
      const { foot, at } = last as { foot: 0 | 1; at: number }
      phase = { foot, since: frame.travelled - at }
    }
  }
  phases.set(exercise, phase)
  return phase
}

/**
 * The exercise's own steps, without its way up to the card (the walks before the station,
 * `stationOf`) and its way on (a last plain walk): those the walkthrough walks along the plan.
 * A way on round the cards (1-114's past its D0 card) stays, but not the straight stretch it
 * ends with. Returns them with the way on's caption, which the way to the next card carries
 * on; `pace`: the pace the card leaves the team in.
 */
function ownSteps(exercise: Exercise, pace: Pace): { steps: ExerciseStep[]; leaving?: string } {
  const steps = exercise.steps.slice(wayUp(exercise))
  const last = steps.at(-1)
  if (last && 'walk' in last && !last.dogChanges) {
    return { steps: steps.slice(0, -1), leaving: last.caption }
  }
  if (last && 'course' in last && last.caption.startsWith('leave')) {
    const [from, to] = last.parts
    const round =
      to - from > 1 ? { ...last, parts: [from, to - 1] as [number, number], pace } : last
    return { steps: [...steps.slice(0, -1), round], leaving: last.caption }
  }
  return { steps }
}

/**
 * The walkthrough of a laid-out deck (`canWalkThrough`), from card `from` on (0: from the
 * start). Starting later, the team sets off a few metres before that card, with the dog on
 * the side and at the pace the course has there.
 */
export function walkthroughOf(deck: Deck, cls: RoClass, start = 0): Walkthrough {
  const layout = deck.layout!
  const round = layout.rounds[0]!
  const entries = deck.entries
  const card = (code: string) => getCard(cls.ruleset, code) as Card
  // A card that follows a leave card starts with it: its dog has to be left first.
  let from = start
  while (from > 0 && card(entries[from]!.code).sequencing.onlyAfterLeave) from--

  // Where each exercise starts, on the scene: the plan's station, and the handler stopping
  // where the exercise's script has it (`stopAt`, from the right in the square).
  const exercises = entries.map((e) => animationOf(e)!)
  const plans = entries.map((e) => fromPlan(e.at!))
  const stationsOnScene = entries.map((e, i) => {
    const plan = fromPlan(e.at!)
    const stop = exercises[i]!.stopAt ?? { x: 0, z: 0 }
    return onField(plan, { ...stop, heading: 0 })
  })
  const startLine = fromPlan(round.start)
  const finishLine = fromPlan(round.finish)
  const setOff =
    from === 0
      ? onField(startLine, { x: 0, z: -RUN_UP, heading: 0 })
      : onField(stationsOnScene[from]!, { x: 0, z: -3, heading: 0 })
  const local = (p: Pose) => within(setOff, p)

  const steps: ExerciseStep[] = []
  const stations: Station[] = []
  let leaving: string | undefined = from === 0 ? 'courseStart' : undefined
  for (let i = from; i < entries.length; i++) {
    const entry = entries[i]!
    const exercise = exercises[i]!
    const at = stationsOnScene[i]!
    const firstStep = steps.length
    const phase = phaseOf(exercise)
    // From a leave card to a follow-up beside its way (3-301, 3-314): at a slant all the way
    // (the author) — past the jump on the way first, along it.
    const before = i > from ? exercises[i - 1]! : undefined
    const aside =
      before && LEAVE_PARTS.includes(before) && !!card(before.code).geometry?.followUp?.sides
    const jump = aside ? before.jumps?.[0] : undefined
    if (jump) steps.push({ walk: jump.z + PAST_THE_JUMP, caption: leaving ?? 'toCard' })
    steps.push({
      walkTo: local(at),
      ...(aside ? { slant: true as const } : { along: local(plans[i]!) }),
      ...(phase && { phase }),
      pace: entry.pace,
      flipped: exercise.dogStarts === 'right',
      caption: leaving ?? 'toCard',
    })
    const cardHere = card(entry.code)
    const after = paceAfter(cardHere, entry.pace, endsStatic(cls, cardHere, entry.supplementary))
    const exerciseStep = steps.length
    const own = ownSteps(exercise, after)
    const place = (p: { x: number; z: number }) => local(onField(at, { ...p, heading: 0 }))
    // A place an exercise sends the dog to, from its station into the walkthrough's frame.
    steps.push(...own.steps.map((s) => ('sendTo' in s ? { ...s, sendTo: place(s.sendTo) } : s)))
    leaving = own.leaving
    const d0 = supplementaryPlace(exercise)
    stations.push({
      index: i,
      code: entry.code,
      ...(entry.supplementary && { supplementary: entry.supplementary }),
      at: local(at),
      card: place(cardPlace(exercise)),
      ...(d0 && { d0: place(d0) }),
      cones: (exercise.cones ?? []).map(place),
      bowls: (exercise.bowls ?? []).map(place),
      jumps: (exercise.jumps ?? []).map(place),
      marks: (exercise.marks ?? []).map((m) => ({
        ...place(m),
        ...(m.lengthwise && { lengthwise: true as const }),
      })),
      firstStep,
      exerciseStep,
    })
  }
  // On to the finish at the pace the last card leaves the team in, through the line.
  const lastEntry = entries.at(-1)!
  const lastCard = card(lastEntry.code)
  const pace = paceAfter(
    lastCard,
    lastEntry.pace,
    endsStatic(cls, lastCard, lastEntry.supplementary),
  )
  // Past the line as far as there is room: not up to another exercise's card or equipment
  // (the plan keeps only the finish itself clear).
  const things = stations.flatMap((s) => [
    s.card,
    ...(s.d0 ? [s.d0] : []),
    ...s.cones,
    ...s.bowls,
    ...s.jumps.flatMap((j) =>
      [-1, 1].map((end) => onField(j, { x: (end * JUMP_WIDTH) / 2, z: 0, heading: 0 })),
    ),
  ])
  const runOut =
    RUN_OUTS.find((d) => {
      const stop = local(onField(finishLine, { x: 0, z: d, heading: 0 }))
      return things.every((q) => Math.hypot(q.x - stop.x, q.z - stop.z) >= RUN_OUT_CLEAR)
    }) ?? RUN_OUTS.at(-1)!
  steps.push(
    { walkTo: local(finishLine), along: local(finishLine), pace, caption: leaving ?? 'toFinish' },
    { walk: runOut, caption: 'finishLine' },
    { stop: true, caption: 'finishLine' },
  )

  const { width, height } = layout
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ].map((p) => local(fromPlan(p))) as [Pose, Pose, Pose, Pose]
  return {
    exercise: {
      code: 'course',
      steps,
      ...(entries[from]!.side === 'right' && { dogStarts: 'right' }),
      // The jumps on the course, for the dog to leap over (the walkthrough's frame: it starts
      // walking, so its station is where it sets off).
      jumps: stations.flatMap((s) => s.jumps),
    },
    field: { corners },
    start: local(startLine),
    finish: local(finishLine),
    startCard: local(onField(startLine, besideLine(deck.options.startSide))),
    finishCard: local(onField(finishLine, besideLine(finishSide(deck)))),
    // "Pokud parkur začíná rovnou na pravou ruku, je karta start doplněna značkou R".
    ...(deck.options.startSide === 'right' && {
      startMark: local(onField(startLine, besideLine('right', MARK_BESIDE))),
    }),
    stations,
    from,
  }
}

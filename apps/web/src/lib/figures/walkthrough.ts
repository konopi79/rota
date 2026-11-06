import {
  endsStatic,
  finishSide,
  geometry,
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
import { animationSetOf, rightSideCards, type AnimationSet } from './animated'
import {
  exercisesOf,
  FOLLOW_UP_PARTS_2027,
  LEAVE_PARTS_2027,
  RIGHT_PARTS,
  RIGHT_PARTS_2027,
} from './exercises'
import { FCI_EXERCISES, FCI_RIGHT_EXERCISES } from './fci-exercises'
import {
  CONE,
  FCI_FOLLOW_UP_PARTS,
  FCI_LEAVE_PARTS,
  FCI_RIGHT_FOLLOW_UP_PARTS,
  FCI_RIGHT_LEAVE_PARTS,
} from './fci-leave-exercises'
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
  /** Done at the station of the card before (CNDC): its card stands beside that one. */
  withPrevious?: true
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
 * D0 card, after the pace the course brings it in — or `undefined` if there is none. FCI's
 * (`ruleset`): a leave card with its recall cone, or its part only when a recall card comes
 * `next`.
 */
export function animationOf(
  entry: DeckEntry,
  ruleset: AnimationSet = 'CZ',
  next?: DeckEntry,
): Exercise | undefined {
  const right = entry.side === 'right'
  if (ruleset === 'FCI') return fciAnimationOf(entry, next)
  if (right && !rightSideCards(ruleset).includes(entry.code)) return undefined
  // A leave card and its follow-up each play their own part, the dog left in between.
  const in2027 = ruleset === 'CZ-2027'
  const parts = (
    right
      ? in2027
        ? RIGHT_PARTS_2027
        : RIGHT_PARTS
      : in2027
        ? [...LEAVE_PARTS_2027, ...FOLLOW_UP_PARTS_2027]
        : [...LEAVE_PARTS, ...FOLLOW_UP_PARTS]
  ).filter((e) => e.code === entry.code)
  if (parts.length) return parts.find((e) => e.supplementary === entry.supplementary) ?? parts[0]
  const variants = exercisesOf(ruleset, right).filter((e) => e.code === entry.code)
  if (entry.supplementary) return variants.find((e) => e.supplementary === entry.supplementary)
  if (variants.some((e) => e.fromPace)) {
    return variants.find((e) => e.fromPace === entry.pace) ?? variants[0]
  }
  return variants[0]
}

/** An FCI card's animation (`animationOf`). */
function fciAnimationOf(entry: DeckEntry, next?: DeckEntry): Exercise | undefined {
  const right = entry.side === 'right'
  const leaveParts = right ? FCI_RIGHT_LEAVE_PARTS : FCI_LEAVE_PARTS
  const followUps = right ? FCI_RIGHT_FOLLOW_UP_PARTS : FCI_FOLLOW_UP_PARTS
  // Its recall card next: the dog left, called there.
  const recallNext = next && followUps.some((f) => f.code === next.code)
  const part = (recallNext ? leaveParts : followUps).find((e) => e.code === entry.code)
  if (part) return part
  // (418 is played from the right leg only, as `FCI_EXERCISES` has it.)
  const all = right
    ? [...FCI_RIGHT_EXERCISES, ...FCI_EXERCISES.filter((e) => e.dogStarts === 'right')]
    : FCI_EXERCISES.filter((e) => e.dogStarts !== 'right')
  const variants = all.filter((e) => e.code === entry.code && (!e.parts || e.pairedWith === CONE))
  if (variants.some((e) => e.fromPace)) {
    return variants.find((e) => e.fromPace === entry.pace) ?? variants[0]
  }
  return variants.find((e) => e.pairedWith === CONE) ?? variants[0]
}

export { canWalkThrough } from './animated'

/**
 * A step with places in its station's frame (`sendTo`, `dogRuns`) in the walkthrough's: the
 * station `at` on the scene, `local` the scene into the walkthrough's frame.
 */
function inWalkthrough(step: ExerciseStep, at: Pose, local: (p: Pose) => Pose): ExerciseStep {
  const place = (p: { x: number; z: number }) => local(onField(at, { ...p, heading: 0 }))
  if ('sendTo' in step) return { ...step, sendTo: place(step.sendTo) }
  // (On a walk, FCI 417 / 418, or round cones, 2027's 1-126.)
  if (('walk' in step || 'course' in step) && step.dogRuns) {
    const via = step.dogRuns.via.map((p) => ({
      ...place(p),
      heading: p.heading + local(at).heading,
    }))
    return { ...step, dogRuns: { ...step.dogRuns, via } }
  }
  return step
}

/** The jumps a station sets out: its exercise's (`Station.jumps` lists them in order). */
const jumpsOfStation = (exercise: Exercise) => exercise.jumps ?? []

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
    // Out of the walk into steps (`fromFoot`) the walk goes on till that foot lands, past the
    // station (312: 0.37 m): lined up then is the last footfall before the station, and the walk
    // goes on as in the animation (`Phase.on`) — lining up the footfall past it instead, the
    // steps slowing into the stride came out shorter, the stride began short, and the dog went
    // under it into the card.
    const next = exercise.steps[first]
    const outOfWalk = next && 'footwork' in next && next.fromFoot !== undefined
    const station = stationOf(exercise)
    let last: { foot: 0 | 1; at: number } | null = null
    while (!frame.finished && frame.stepIndex < first) {
      const before = frame.feet.handler
      frame = player.step(1 / 60)
      frame.feet.handler.forEach((foot, i) => {
        if (before[i]?.swing && !foot.swing && !(outOfWalk && frame.travelled > station + 1e-6))
          last = { foot: i as 0 | 1, at: frame.travelled }
      })
    }
    if (last) {
      const { foot, at } = last as { foot: 0 | 1; at: number }
      phase = outOfWalk
        ? { foot, since: station - at, on: Math.max(0, frame.travelled - station) }
        : { foot, since: frame.travelled - at }
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
  // A card that follows a leave card starts with it: its dog has to be left first. A card done
  // at the station of the one before (CNDC) starts with the station's first.
  let from = start
  while (
    from > 0 &&
    (entries[from]!.withPrevious || card(entries[from]!.code).sequencing.onlyAfterLeave)
  )
    from--

  // Where each exercise starts, on the scene: the plan's station, and the handler stopping
  // where the exercise's script has it (`stopAt`, from the right in the square).
  const exercises = entries.map((e, i) =>
    animationOf(e, animationSetOf(cls.ruleset), entries[i + 1])!,
  )
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
  // Each station's jumps, by index into all of them (`Walkthrough.exercise.jumps`): a card goes
  // over its own and its leave card's only — no other station's on the way (`onlyJumps`).
  const jumpsAt: number[][] = []
  let jumpCount = 0
  for (let i = from; i < entries.length; i++) {
    const entry = entries[i]!
    const exercise = exercises[i]!
    const ownJumps = jumpsOfStation(exercise).map(() => jumpCount++)
    jumpsAt[i] = ownJumps
    const follows = card(entry.code).sequencing.onlyAfterLeave ? (jumpsAt[i - 1] ?? []) : []
    const firstStep = steps.length
    // Several cards at one station (CNDC): the next exercise right where the one before ends,
    // after a dynamic one a step on ("krok dopředu pro ukončení cviku", řád p. 16) — no way
    // to it. Its card on the station's stand, beside the one before.
    const previousEntry = entries[i - 1]
    if (i > from && entry.withPrevious && previousEntry) {
      const previous = card(previousEntry.code)
      if (!endsStatic(cls, previous, previousEntry.supplementary)) {
        steps.push({ walk: geometry.CNDC_STEP, pace: entry.pace, caption: 'cndcStep' })
      } else {
        steps.push({ wait: 0.4, caption: 'cndcNext' })
      }
      steps.push({ dogSide: exercise.dogStarts ?? 'left', caption: 'cndcNext' })
      const exerciseStep = steps.length
      const cardHere = card(entry.code)
      const after = paceAfter(cardHere, entry.pace, endsStatic(cls, cardHere, entry.supplementary))
      const own = ownSteps(exercise, after)
      // Where the team is now, as the plan has it: the frame of the exercise's own steps.
      const here = fromPlan(entry.at!)
      steps.push(...own.steps.map((s) => inWalkthrough(s, here, local)))
      leaving = own.leaving
      // Beside the card before (and its D0 card), facing the same way.
      const before = stations.at(-1)!
      const besides = previousEntry.supplementary ? 2 : 1
      const stand = (n: number) =>
        onField(before.card, { x: -n * geometry.D0_BESIDE, z: 0, heading: 0 })
      stations.push({
        index: i,
        code: entry.code,
        ...(entry.supplementary && { supplementary: entry.supplementary }),
        at: local(here),
        card: stand(besides),
        ...(entry.supplementary && { d0: stand(besides + 1) }),
        cones: [],
        bowls: [],
        jumps: [],
        marks: [],
        firstStep,
        exerciseStep,
        withPrevious: true,
      })
      continue
    }
    const at = stationsOnScene[i]!
    const phase = phaseOf(exercise)
    // From a leave card to a follow-up beside its way (3-301, 3-314): at a slant all the way
    // (the author) — past the jump on the way first, along it.
    const before = i > from ? exercises[i - 1]! : undefined
    const aside =
      before &&
      (LEAVE_PARTS.includes(before) || LEAVE_PARTS_2027.includes(before)) &&
      !!card(before.code).geometry?.followUp?.sides
    const jump = aside ? before.jumps?.[0] : undefined
    if (jump) steps.push({ walk: jump.z + geometry.PAST_THE_JUMP, caption: leaving ?? 'toCard' })
    steps.push({
      walkTo: local(at),
      onlyJumps: [...follows, ...ownJumps],
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
    // A place an exercise sends the dog to, and the way it runs on its own (FCI 417 / 418),
    // from its station into the walkthrough's frame.
    steps.push(...own.steps.map((s) => inWalkthrough(s, at, local)))
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
    {
      walkTo: local(finishLine),
      onlyJumps: [],
      along: local(finishLine),
      pace,
      caption: leaving ?? 'toFinish',
    },
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
      // (The cards as large as the class's — FCI's nearer A4 — for the dog's tail to keep over
      // every one of them, the start's and the finish's too.)
      ...(cls.ruleset === 'FCI' && { ruleset: 'FCI' }),
      stands: [
        ...stations.flatMap((s) => [s.card, ...(s.d0 ? [s.d0] : [])]),
        local(onField(startLine, besideLine(deck.options.startSide))),
        local(onField(finishLine, besideLine(finishSide(deck)))),
      ],
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

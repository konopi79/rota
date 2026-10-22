import { getClass } from '../registry'
import type { Card, Field, RoClass } from '../schema'
import { mulberry32, pick, pickWeighted } from './prng'
import { normalize, turnsOf } from './geometry'
import { FieldPlanner, type PlannerState } from './layout'
import { NationalCourse } from './course'
import { cardOf, endsStatic, fieldKey, fieldOf, hasEquipment, paceAfter, sideAfter } from './rules'
import type { Deck, DeckEntry, DealOptions, Layout, Pace, Side } from './types'

const ATTEMPTS = 100
/**
 * Cards taken back per attempt when the next one fits nowhere on the field. With the
 * direction changed only by the cards, the field fills up quickly; going back a card or
 * two and trying another one there finds a way on far more often than starting again.
 */
const BACKTRACKS = 20

type State = {
  prev: Card | undefined
  prevStatic: boolean
  pace: Pace
  side: Side
  /** Main cards already dealt (drawn without replacement). */
  used: Set<string>
  /** How often each card appears so far, follow-ups included (`course.maxRepeats`). */
  counts: Map<string, number>
  /** Cards dealt per point value (competition point mix). */
  byPoints: Map<number, number>
}

/** How much more likely a card is drawn while its point value is still short. */
const QUOTA_WEIGHT = 4
/**
 * Laid-out classes: with less than this many metres of way ahead (`FieldPlanner.runway`),
 * cards that change the direction are this much more likely — the field is about to end.
 */
const SHORT_RUNWAY = 8
const TURN_WEIGHT = 6
/**
 * How often a leave card gets one of its optional recall cards (FCI): on the judges' courses
 * of `course.judgesUsage`, 191 of 255 leave cards did.
 */
const FOLLOW_UP_SHARE = 0.75
/**
 * A competition course may repeat a card (`course.maxRepeats`, FCI), drawn with this much
 * less weight once it is on the course — judges repeat about one card in three courses.
 */
const REPEAT_WEIGHT = 0.03
/**
 * How far each card's weight leans from an even deal towards the judges' usage
 * (`course.dealWeights`): drawn anew per card and course from this interval, so a course
 * follows the judges' taste without copying their numbers — and a card they never set
 * still turns up now and then. The weights are calibrated with the lean drawn this way.
 */
const USAGE_LEAN = { min: 0.5, max: 1 }

/**
 * Deal a performable deck (plan §5, D8). Builds the sequence card by card, drawing only
 * from cards that are valid in the current state; a dead end restarts the attempt with
 * the same random stream, so a seed still reproduces its deck. If no attempt reaches
 * `count` (the pool is too small for the options), the longest attempt is returned —
 * the caller compares `entries.length` with the requested count.
 *
 * Classes with `course.fields` (FCI) are laid out on one (`fieldOf`) as they are dealt, up to
 * one course (`course.maxCards`): a card that does not fit where the team stands is set
 * aside for that step, a dead end takes cards back (`BACKTRACKS`), and the deck carries
 * the layout (start, each card's `at`, finish). A longer deck — or a training deck that
 * fits on no field — goes without one: with the direction changed only by the cards, a
 * second field dealt from what the first one left would run short of such cards.
 */
export function dealDeck(options: DealOptions): Deck {
  const cls = getClass(options.classId)
  if (!cls) throw new Error(`No content for class ${options.classId}`)

  const usable = (code: string) => hasEquipment(cardOf(cls, code), options)
  const inClass = new Set(cls.cardCodes.filter(usable))
  const scope =
    options.scope === 'new' && cls.newCardCodes.length ? cls.newCardCodes : cls.cardCodes
  // Main cards: drawn without replacement. Leave follow-ups come from the whole class
  // (even in "new cards only" — a leave card is not performable without one) and may
  // repeat, since several leave cards can share them.
  const mainPool = scope.filter((c) => usable(c) && !cardOf(cls, c).sequencing.onlyAfterLeave)

  const random = mulberry32(options.seed)
  const field = options.count <= cls.course.maxCards ? fieldOf(cls, options) : undefined
  const usage = options.competition && field ? usageWeights(cls, field, random) : undefined
  let best: Dealt = { entries: [] }
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const { complete, ...dealt } = attemptDeal(
      cls,
      options,
      mainPool,
      inClass,
      random,
      usage,
      field,
    )
    if (dealt.entries.length === options.count && complete !== false) return { options, ...dealt }
    if (dealt.entries.length > best.entries.length) best = dealt
  }
  // A training deck that fits on no field goes without a plan.
  if (field && !options.competition) {
    const { complete: _, ...dealt } = attemptDeal(cls, options, mainPool, inClass, random, usage)
    if (dealt.entries.length > best.entries.length) best = dealt
  }
  return { options, ...best }
}

/**
 * A competition course's weight per card (FCI): between an even deal (1) and the card's
 * calibrated weight on this field, leaning `USAGE_LEAN` of the way, drawn per card.
 */
function usageWeights(
  cls: RoClass,
  field: Field,
  random: () => number,
): Map<string, number> | undefined {
  const weights = cls.course.dealWeights?.[fieldKey(field)]
  if (!weights) return undefined
  return new Map(
    cls.cardCodes.map((code) => {
      const lean = USAGE_LEAN.min + random() * (USAGE_LEAN.max - USAGE_LEAN.min)
      return [code, (weights[code] ?? 1) ** lean]
    }),
  )
}

type Dealt = { entries: DeckEntry[]; layout?: Layout }
/** `complete`: a national course has every exercise the guidelines require. */
type Attempt = Dealt & { complete?: boolean }

function attemptDeal(
  cls: RoClass,
  options: DealOptions,
  mainPool: string[],
  inClass: Set<string>,
  random: () => number,
  usage: Map<string, number> | undefined,
  field?: Field,
): Attempt {
  const entries: DeckEntry[] = []
  const planner = field && new FieldPlanner(field.width, field.height, random)
  // The start is walked through at normal pace, not from a standstill.
  const state: State = {
    prev: undefined,
    prevStatic: false,
    pace: 'normal',
    side: options.startSide,
    used: new Set(),
    counts: new Map(),
    byPoints: new Map(),
  }
  const quota = options.competition ? (cls.course.minByPoints ?? {}) : {}
  // A competition course is dealt like judges set them (FCI): their cards more often
  // (`usage`), a card now and then twice (`maxRepeats` is checked in `allowed`).
  const repeats = !!options.competition && !!cls.course.maxRepeats
  // A national course follows the judges' guidelines: repeats, required exercises,
  // RO-Z's static/dynamic balance, side changes.
  const course = NationalCourse.of(cls, options, inClass, random)
  const missing = (points: number | undefined) =>
    points === undefined
      ? 0
      : Math.max(0, (quota[String(points)] ?? 0) - (state.byPoints.get(points) ?? 0))
  // A laid-out deck backtracks (`BACKTRACKS`): the state before each position and the
  // cards that led to a dead end from there.
  const snapshots: { state: State; layout: PlannerState; banned: Set<string> }[] = []
  let backtracks = course ? 0 : BACKTRACKS

  while (entries.length < options.count) {
    const position = entries.length
    if (planner && !snapshots[position]) {
      snapshots[position] = { state: copyState(state), layout: planner.save(), banned: new Set() }
    }
    const banned = snapshots[position]?.banned
    const remaining = options.count - entries.length
    const required = state.prev?.sequencing.nextOneOf
    const optional = state.prev?.sequencing.mayBeFollowedBy ?? []
    const mains = mainPool.filter((c) =>
      course ? course.left(c) > 0 : repeats || !state.used.has(c),
    )
    // After a leave card the follow-up is required (national) or optional (FCI recall).
    const candidates = (
      required
        ? required.filter((c) => inClass.has(c))
        : [...mains, ...optional.filter((c) => inClass.has(c))]
    )
      .map((c) => cardOf(cls, c))
      .filter(
        (card) =>
          !banned?.has(card.code) &&
          allowed(cls, card, state, remaining, inClass) &&
          (!course || course.fits(card, entries.length, state.side)),
      )

    // Competition point mix: prefer cards whose points are still short; once the
    // remaining slots only just cover what is missing, allow nothing else.
    const short = Object.keys(quota).reduce((sum, p) => sum + missing(Number(p)), 0)
    const quotaFit =
      short > 0 && remaining <= short ? candidates.filter((c) => missing(c.points) > 0) : candidates
    // Required exercises of a national course: the same, preferred and then forced.
    const eligible =
      course && !required && course.mustHelp(entries.length)
        ? quotaFit.filter((c) => course.helps(c))
        : quotaFit
    const followUps = new Set(optional)
    const followUpCount = eligible.filter((c) => followUps.has(c.code)).length
    const cornered = !!planner && planner.runway() < SHORT_RUNWAY
    const weighted = short > 0 || followUpCount > 0 || !!course || cornered || !!usage
    const weightOf = (c: Card) =>
      (usage?.get(c.code) ?? 1) *
      (repeats && state.used.has(c.code) ? REPEAT_WEIGHT : 1) *
      (short > 0 && missing(c.points) > 0 ? QUOTA_WEIGHT : 1) *
      (course?.helps(c) ? QUOTA_WEIGHT : 1) *
      (cornered && turnsOf(c).some((t) => normalize(t) !== 0) ? TURN_WEIGHT : 1)
    const weights = new Map(weighted ? eligible.map((c) => [c, weightOf(c)]) : [])
    // After a leave card whose recall card is optional (FCI), deal one `FOLLOW_UP_SHARE` of
    // the time: the recall cards together weigh that share of everything eligible.
    if (followUpCount > 0 && followUpCount < eligible.length) {
      const sum = (of: (c: Card) => boolean) =>
        eligible.filter(of).reduce((total, c) => total + (weights.get(c) ?? 1), 0)
      const isFollowUp = (c: Card) => followUps.has(c.code)
      const scale =
        (FOLLOW_UP_SHARE / (1 - FOLLOW_UP_SHARE)) * (sum((c) => !isFollowUp(c)) / sum(isFollowUp))
      for (const c of eligible) if (isFollowUp(c)) weights.set(c, (weights.get(c) ?? 1) * scale)
    }
    const draw = (): { card: Card; at?: DeckEntry['at'] } | undefined => {
      let pool = eligible
      while (pool.length) {
        const card = weighted
          ? pickWeighted(pool, (c) => weights.get(c) ?? 1, random)
          : pick(pool, random)
        if (!card) return undefined
        if (!planner) return { card }
        const at = planner.place(card, state.side)
        if (at) return { card, at }
        // No room for this card here; try another one.
        pool = pool.filter((c) => c !== card)
      }
      return undefined
    }
    const drawn = draw()
    // Nothing fits: take the last card back and try another one in its place.
    const last = entries.at(-1)
    const snapshot = snapshots[entries.length - 1]
    if (!drawn && planner && backtracks > 0 && last && snapshot) {
      backtracks--
      entries.pop()
      snapshots.length = entries.length + 1
      snapshot.banned.add(last.code)
      Object.assign(state, copyState(snapshot.state))
      planner.restore(snapshot.layout)
      continue
    }
    if (!drawn) break
    const { card, at } = drawn

    const supplementary = card.sequencing.requiresSupplementary
      ? pick(course ? course.supplementaries(card) : cls.course.supplementary, random)
      : undefined
    entries.push({
      code: card.code,
      supplementary,
      side: state.side,
      pace: state.pace,
      ...(at && { at }),
    })

    const static_ = endsStatic(cls, card, supplementary)
    course?.record(card, supplementary, static_)
    if (!card.sequencing.onlyAfterLeave) state.used.add(card.code)
    state.counts.set(card.code, (state.counts.get(card.code) ?? 0) + 1)
    if (card.points) state.byPoints.set(card.points, (state.byPoints.get(card.points) ?? 0) + 1)
    state.pace = paceAfter(card, state.pace, static_)
    state.side = sideAfter(cls, card, state.side, supplementary)
    state.prevStatic = static_
    state.prev = card
  }
  const complete = course?.complete
  if (!planner || !field) return { entries, complete }
  // The planner always keeps room for one more card, so the finish fits.
  const finish = planner.finish()
  if (!finish) return { entries: [] }
  const { width, height } = field
  return {
    entries,
    layout: { width, height, rounds: [{ first: 0, start: planner.start, finish }] },
    complete,
  }
}

function copyState(state: State): State {
  return {
    ...state,
    used: new Set(state.used),
    counts: new Map(state.counts),
    byPoints: new Map(state.byPoints),
  }
}

function allowed(
  cls: RoClass,
  card: Card,
  state: State,
  remaining: number,
  inClass: Set<string>,
): boolean {
  const seq = card.sequencing
  if (card.code === state.prev?.code) return false
  if (seq.afterStatic && !state.prevStatic) return false
  if (seq.pace && seq.pace === state.pace) return false
  // FCI: in slow/fast pace only the flowing exercises (105–113) or another pace card.
  if (
    cls.course.paceCompatibleOnly &&
    state.pace !== 'normal' &&
    !seq.pace &&
    !seq.paceCompatible
  ) {
    return false
  }
  if (seq.sideOnly && seq.sideOnly !== state.side) return false
  if (cls.course.maxRepeats && (state.counts.get(card.code) ?? 0) >= cls.course.maxRepeats) {
    return false
  }
  if (seq.lastOnly?.includes(cls.id) && remaining !== 1) return false
  // A leave card needs room for its follow-up and at least one follow-up in the class.
  if (seq.nextOneOf && (remaining < 2 || !seq.nextOneOf.some((c) => inClass.has(c)))) {
    return false
  }
  return true
}

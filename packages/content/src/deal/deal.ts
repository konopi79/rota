import { getClass } from '../registry'
import type { Card, RoClass } from '../schema'
import { mulberry32, pick, pickWeighted } from './prng'
import { FieldPlanner } from './layout'
import { cardOf, endsStatic, hasEquipment, paceAfter, sideAfter } from './rules'
import type { Deck, DeckEntry, DealOptions, Layout, Pace, Round, Side } from './types'

const ATTEMPTS = 50

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
 * Deal a performable deck (plan §5, D8). Builds the sequence card by card, drawing only
 * from cards that are valid in the current state; a dead end restarts the attempt with
 * the same random stream, so a seed still reproduces its deck. If no attempt reaches
 * `count` (the pool is too small for the options), the longest attempt is returned —
 * the caller compares `entries.length` with the requested count.
 *
 * Classes with a `course.field` (FCI) are laid out on that field as they are dealt: a
 * card that does not fit where the team stands is set aside for that step, and the deck
 * carries the layout (start, each card's `at`, finish). A deck longer than a course is
 * split into even rounds of at most `course.maxCards`, each on an empty field; a training
 * deck whose field fills up early starts a new round there.
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
  let best: Dealt = { entries: [] }
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const dealt = attemptDeal(cls, options, mainPool, inClass, random)
    if (dealt.entries.length === options.count) return { options, ...dealt }
    if (dealt.entries.length > best.entries.length) best = dealt
  }
  return { options, ...best }
}

type Dealt = { entries: DeckEntry[]; layout?: Layout }

function attemptDeal(
  cls: RoClass,
  options: DealOptions,
  mainPool: string[],
  inClass: Set<string>,
  random: () => number,
): Dealt {
  const entries: DeckEntry[] = []
  const field = cls.course.field
  const roundCount = Math.ceil(options.count / cls.course.maxCards)
  const roundFirsts = Array.from({ length: roundCount }, (_, k) =>
    Math.round((k * options.count) / roundCount),
  )
  const rounds: Round[] = []
  let planner: FieldPlanner | undefined
  let first = 0
  /** Ends the current round with its finish; `false` if the finish does not fit. */
  const closeRound = (): boolean => {
    // Not even started: the pool ran out right at a round boundary.
    if (!planner || first === entries.length) return true
    // The planner always keeps room for one more card, so the finish fits.
    const finish = planner.finish()
    if (!finish) return false
    rounds.push({ first, start: planner.start, finish })
    return true
  }
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
  const missing = (points: number | undefined) =>
    points === undefined
      ? 0
      : Math.max(0, (quota[String(points)] ?? 0) - (state.byPoints.get(points) ?? 0))

  while (entries.length < options.count) {
    const newRound = () => {
      planner = field && new FieldPlanner(field.width, field.height, random)
      first = entries.length
    }
    if (field && roundFirsts.includes(entries.length)) {
      if (!closeRound()) return { entries: [] }
      newRound()
    }
    const remaining = options.count - entries.length
    const required = state.prev?.sequencing.nextOneOf
    const optional = state.prev?.sequencing.mayBeFollowedBy ?? []
    const mains = mainPool.filter((c) => !state.used.has(c))
    // After a leave card the follow-up is required (national) or optional (FCI recall).
    const candidates = (
      required
        ? required.filter((c) => inClass.has(c))
        : [...mains, ...optional.filter((c) => inClass.has(c))]
    )
      .map((c) => cardOf(cls, c))
      .filter((card) => allowed(cls, card, state, remaining, inClass))

    // Competition point mix: prefer cards whose points are still short; once the
    // remaining slots only just cover what is missing, allow nothing else.
    const short = Object.keys(quota).reduce((sum, p) => sum + missing(Number(p)), 0)
    const eligible =
      short > 0 && remaining <= short ? candidates.filter((c) => missing(c.points) > 0) : candidates
    // After a leave card whose recall card is optional (FCI), deal one about half the time —
    // judges' course plans nearly always have one there.
    const followUps = new Set(optional)
    const followUpCount = eligible.filter((c) => followUps.has(c.code)).length
    const followUpWeight = followUpCount ? (eligible.length - followUpCount) / followUpCount : 1
    const weighted = short > 0 || followUpCount > 0
    const weightOf = (c: Card) =>
      (short > 0 && missing(c.points) > 0 ? QUOTA_WEIGHT : 1) *
      (followUps.has(c.code) ? followUpWeight : 1)
    const draw = (): { card: Card; at?: DeckEntry['at'] } | undefined => {
      let pool = eligible
      while (pool.length) {
        const card = weighted ? pickWeighted(pool, weightOf, random) : pick(pool, random)
        if (!card) return undefined
        if (!planner) return { card }
        const at = planner.place(card, state.side)
        if (at) return { card, at }
        // No room for this card here; try another one.
        pool = pool.filter((c) => c !== card)
      }
      return undefined
    }
    let drawn = draw()
    // A training deck whose field is full goes on in a new round; a course stays on one.
    if (!drawn && field && !options.competition && entries.length > first) {
      if (!closeRound()) return { entries: [] }
      newRound()
      drawn = draw()
    }
    if (!drawn) break
    const { card, at } = drawn

    const supplementary = card.sequencing.requiresSupplementary
      ? pick(cls.course.supplementary, random)
      : undefined
    entries.push({
      code: card.code,
      supplementary,
      side: state.side,
      pace: state.pace,
      ...(at && { at }),
    })

    const static_ = endsStatic(cls, card, supplementary)
    if (!card.sequencing.onlyAfterLeave) state.used.add(card.code)
    state.counts.set(card.code, (state.counts.get(card.code) ?? 0) + 1)
    if (card.points) state.byPoints.set(card.points, (state.byPoints.get(card.points) ?? 0) + 1)
    state.pace = paceAfter(card, state.pace, static_)
    state.side = sideAfter(card, state.side)
    state.prevStatic = static_
    state.prev = card
  }
  if (!field) return { entries }
  if (!closeRound()) return { entries: [] }
  return { entries, layout: { width: field.width, height: field.height, rounds } }
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

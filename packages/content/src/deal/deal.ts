import { getClass } from '../registry'
import type { Card, RoClass } from '../schema'
import { mulberry32, pick } from './prng'
import { cardOf, endsStatic, hasEquipment, paceAfter, sideAfter } from './rules'
import type { Deck, DeckEntry, DealOptions, Pace, Side } from './types'

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
}

/**
 * Deal a performable deck (plan §5, D8). Builds the sequence card by card, drawing only
 * from cards that are valid in the current state; a dead end restarts the attempt with
 * the same random stream, so a seed still reproduces its deck. If no attempt reaches
 * `count` (the pool is too small for the options), the longest attempt is returned —
 * the caller compares `entries.length` with the requested count.
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
  let best: DeckEntry[] = []
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const entries = attemptDeal(cls, options, mainPool, inClass, random)
    if (entries.length === options.count) return { options, entries }
    if (entries.length > best.length) best = entries
  }
  return { options, entries: best }
}

function attemptDeal(
  cls: RoClass,
  options: DealOptions,
  mainPool: string[],
  inClass: Set<string>,
  random: () => number,
): DeckEntry[] {
  const entries: DeckEntry[] = []
  // The start is walked through at normal pace, not from a standstill.
  const state: State = {
    prev: undefined,
    prevStatic: false,
    pace: 'normal',
    side: options.startSide,
    used: new Set(),
    counts: new Map(),
  }

  while (entries.length < options.count) {
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

    const card = pick(candidates, random)
    if (!card) break

    const supplementary = card.sequencing.requiresSupplementary
      ? pick(cls.course.supplementary, random)
      : undefined
    entries.push({ code: card.code, supplementary, side: state.side, pace: state.pace })

    const static_ = endsStatic(cls, card, supplementary)
    if (!card.sequencing.onlyAfterLeave) state.used.add(card.code)
    state.counts.set(card.code, (state.counts.get(card.code) ?? 0) + 1)
    state.pace = paceAfter(card, state.pace, static_)
    state.side = sideAfter(card, state.side)
    state.prevStatic = static_
    state.prev = card
  }
  return entries
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

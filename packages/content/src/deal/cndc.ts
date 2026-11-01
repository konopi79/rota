import type { Card, RoClass } from '../schema'
import { turnsOf } from './geometry'
import { cardOf, endsStatic } from './rules'
import type { DeckEntry } from './types'

/**
 * CNDC — "cviky s několika dílčími cviky", several cards at one station (plan R18): "mohou
 * zahrnovat až 3 cviky umístěné přímo vedle sebe … provedeny buď zleva doprava nebo shora
 * dolů" (řád p. 16); RO-Z has none, RO1 and RO-V at most three of two cards (Směrnice
 * §1.1.1), RO2 and RO3 no limit stated (`course.cndc`).
 *
 * Stricter than the rules on purpose (the author, 2026-11-01: "lepší mít přísnější verzi než
 * žádnou … povolit můžeme vždycky"): what the regulation and the guidelines leave open — which
 * cards may stand in a CNDC, which pairs "představují cvik z vyšší třídy" (Směrnice §1.1.6,
 * one example given) — is answered the safe way, so a group dealt is always allowed; some
 * allowed groups are never dealt.
 */

/**
 * Cards never put in a CNDC: with equipment (a jump's dog way, cones and bowls to go round),
 * the pace cards (a pace holds on past the station), the ones that need room ahead of them
 * (1-107, 2-227: 6 m; 3-323: 8 m — Směrnice §1.1.2).
 */
const NEEDS_ROOM = new Set(['1-107', '2-227', '3-323'])
export const cndcEligible = (card: Card): boolean =>
  card.kind === 'exercise' &&
  !(card.sequencing.equipment ?? []).length &&
  !card.sequencing.pace &&
  !NEEDS_ROOM.has(card.code)

/**
 * The cards that turn — change direction, or turn round on the spot (360°, about twice) — for
 * "U CNDC se změnou (změnami) směru se musí dbát na to, aby se vždy postavila nejprve jedna
 * změna směru" (Směrnice §1.1.6): a group with one starts with one, as on every real course
 * plan seen (302 + D0c + 031, 120 + 317, 216 + 201 + 206).
 */
const TURNS_ROUND = new Set(['Z-013', '1-101', '1-116', '1-121', '1-122', '3-315'])
export const turns = (card: Card): boolean =>
  turnsOf(card).some((t) => t !== 0) || TURNS_ROUND.has(card.code)

/** A side step (1-102, 1-114, 1-115, 2-207, 2-222, 2-229): done before its card, not a turn. */
const stepsAside = (card: Card): boolean => card.placement === 'B' && !turns(card)

/**
 * Cards that, after a static exercise, only add a position change — the pair is then one of
 * the class's own cards ("Stop – vstaň – sedni", "Stop – stůj – lehni", …).
 */
const POSITION_ONLY = new Set(['Z-001', 'Z-002', '1-109', '1-118', '2-209'])

/** A card that starts from a stop or a stand ("Stop – …", "Stůj – …", "Zastavit – …"). */
const FROM_A_STOP = /^(Stop|Stůj|Zastav)/

/**
 * Why `second` may not follow `first` in a group, if it may not: a pair that "by ve svém
 * provádění představoval cvik z vyšší třídy" (Směrnice §1.1.6, "např. 105/112 představuje
 * 105/205"). Derived from the cards, not listed by the guidelines — to be confirmed:
 * - from a stop (any static exercise) a turn while walking is "Stop / Stůj – obrat – vpřed"
 *   (1-103, 1-104, 1-119, 1-120, 2-205, 2-206, 2-225, 2-226);
 * - two turns from a stop are one turn from a stop (2-203, 2-204, 3-316, 3-317);
 * - a position after a static exercise is "Stop – vstaň – sedni", "Stop – stůj – lehni", …
 */
export function forbiddenPair(cls: RoClass, first: DeckEntry, second: DeckEntry): boolean {
  const [a, b] = [cardOf(cls, first.code), cardOf(cls, second.code)]
  if (!endsStatic(cls, a, first.supplementary)) return false
  const bStatic = endsStatic(cls, b, second.supplementary)
  // (Not the cards that start from a stop themselves: 201 + 206 stand together on a plan.)
  if (turns(b) && !bStatic && !FROM_A_STOP.test(b.name)) return true
  if (turns(a) && turns(b) && bStatic) return true
  return POSITION_ONLY.has(b.code)
}

/**
 * How sure a CNDC rule is (a hand-made course is checked up to one, plan §12): the regulation's,
 * the judges' guidelines', or one of ROTA's own safe-side choices the dealer keeps to.
 */
export type CndcLevel = 'rules' | 'guidelines' | 'strict'

/** What is wrong with a card at a station of several. */
export type CndcReason =
  /** The class has no CNDC (RO-Z: řád p. 11; FCI). */
  | 'no-cndc'
  /** More cards than `max` at one station: 3 (řád p. 16), RO1 and RO-V 2 (Směrnice §1.1.1). */
  | 'too-many'
  /** A change of direction, but not first (Směrnice §1.1.6). */
  | 'turn-first'
  /**
   * The pair "by ve svém provádění představoval cvik z vyšší třídy" (Směrnice §1.1.6): the
   * guidelines' own example 105/112, or one derived from the cards (`forbiddenPair`, strict).
   */
  | 'higher-class'
  // ROTA's safe side (strict):
  | 'equipment'
  | 'pace'
  | 'long'
  | 'leave-last'
  | 'follow-up-first'
  | 'side-step-first'
  | 'ends-behind'

/** A problem at the card `at` of a station (index into it). */
export type CndcProblem = { at: number; reason: CndcReason; level: CndcLevel; max?: number }

/** The guidelines' example: "např. 105/112 představuje 105/205" (Směrnice §1.1.6). */
const HIGHER_CLASS_PAIRS = [['1-105', '1-112']]

/** "mohou zahrnovat až 3 cviky" (řád p. 16). */
const MOST_CARDS = 3

/**
 * Everything wrong with `entries` standing at one station, in this order, each with how sure
 * the rule is (`CndcLevel`): the class has CNDC (rules); as many cards as allowed (rules: 3,
 * guidelines: the class's `cards`); a change of direction first, not 105/112 (guidelines); and
 * the safe side (strict) — each card eligible (`cndcEligible`), a leave card only last (its
 * follow-up is the next station's), a follow-up only first, a card ending behind where it starts
 * only last, a side step only first, no pair derived as a higher class's (`forbiddenPair`).
 */
export function stationProblems(cls: RoClass, entries: DeckEntry[]): CndcProblem[] {
  const limits = cls.course.cndc
  if (entries.length < 2) return []
  if (!limits) {
    return entries.slice(1).map((_, i) => ({ at: i + 1, reason: 'no-cndc', level: 'rules' }))
  }
  const problems: CndcProblem[] = []
  const cards = entries.map((e) => cardOf(cls, e.code))
  const add = (at: number, reason: CndcReason, level: CndcLevel, max?: number) =>
    problems.push({ at, reason, level, ...(max !== undefined && { max }) })
  cards.forEach((card, i) => {
    if (i >= MOST_CARDS) add(i, 'too-many', 'rules', MOST_CARDS)
    else if (i >= limits.cards) add(i, 'too-many', 'guidelines', limits.cards)
    if ((card.sequencing.equipment ?? []).length) add(i, 'equipment', 'strict')
    if (card.sequencing.pace) add(i, 'pace', 'strict')
    if (NEEDS_ROOM.has(card.code)) add(i, 'long', 'strict')
    const last = i === cards.length - 1
    if (!last && card.sequencing.nextOneOf) add(i, 'leave-last', 'strict')
    // Nor one that ends back where the handler stepped to (`geometry.exit` < 0: steps back,
    // turns done backwards): the next exercise would start there, where the plan has no place
    // for it.
    if (!last && (card.geometry?.exit ?? 0) < 0) add(i, 'ends-behind', 'strict')
    if (i > 0 && card.sequencing.onlyAfterLeave) add(i, 'follow-up-first', 'strict')
    // A side step only first: its card stands right before it (§5.3.1), and further on in a
    // group the station's cards stand where the step goes (walked through in animation).
    if (i > 0 && stepsAside(card)) add(i, 'side-step-first', 'strict')
    if (i > 0) {
      const pair = [cards[i - 1]?.code, card.code]
      if (HIGHER_CLASS_PAIRS.some(([a, b]) => a === pair[0] && b === pair[1])) {
        add(i, 'higher-class', 'guidelines')
      } else if (forbiddenPair(cls, entries[i - 1] as DeckEntry, entries[i] as DeckEntry)) {
        add(i, 'higher-class', 'strict')
      }
    }
  })
  const turning = cards.findIndex(turns)
  if (turning > 0) add(turning, 'turn-first', 'guidelines')
  return problems
}

/**
 * Whether `entries` may stand at one station, in this order, by every rule — the safe side
 * included (`stationProblems`): what the dealer groups.
 */
export function cndcAllowed(cls: RoClass, entries: DeckEntry[]): boolean {
  return !!cls.course.cndc && entries.length >= 2 && !stationProblems(cls, entries).length
}

/**
 * How many CNDC a course may have at most, by the guidelines (RO1, RO-V: "maximálně 3 CNDC",
 * Směrnice §1.1.1) and by the safe side the dealer keeps to (`course.cndc.groups`).
 */
export function mostStations(cls: RoClass): { guidelines?: number; strict?: number } {
  const limits = cls.course.cndc
  if (!limits) return {}
  return {
    ...(limits.guidelinesGroups !== undefined && { guidelines: limits.guidelinesGroups }),
    strict: limits.groups[1],
  }
}

/**
 * Whether the next card at the same station comes after a step forward: "po všech ¨B¨
 * (dynamických) cvicích je nutné provést krok dopředu pro ukončení cviku. Teprve poté se psovod
 * může rozhodnout, zda udělá ještě jeden mezikrok" (řád p. 16).
 */
export const stepForwardAfter = (cls: RoClass, entry: DeckEntry): boolean =>
  !endsStatic(cls, cardOf(cls, entry.code), entry.supplementary)

/** The stations of a deck: runs of entries, each next one `withPrevious`, as index ranges. */
export function stationsOf(entries: DeckEntry[]): [number, number][] {
  const stations: [number, number][] = []
  entries.forEach((e, i) => {
    const last = stations.at(-1)
    if (e.withPrevious && last) last[1] = i
    else stations.push([i, i])
  })
  return stations
}

/**
 * Groups cards of a dealt deck into CNDC (`withPrevious`), the order left as it is: as many
 * groups as `course.cndc.groups` allows (between its least and most, drawn), of two or three
 * cards as `cards` allows, where `cndcAllowed`.
 */
export function groupStations(
  cls: RoClass,
  entries: DeckEntry[],
  random: () => number,
): DeckEntry[] {
  const limits = cls.course.cndc
  if (!limits) return entries
  const [least, most] = limits.groups
  const wanted = least + Math.floor(random() * (most - least + 1))
  const taken = new Set<number>()
  const starts: number[] = []
  // Every place a group could start, in random order.
  const order = entries.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j] as number, order[i] as number]
  }
  const sizes = new Map<number, number>()
  for (const start of order) {
    if (starts.length >= wanted) break
    // As many cards as allowed, or fewer: three now and then, where the class allows them.
    const size = limits.cards > 2 && random() < THREE_SHARE ? 3 : 2
    for (const n of size === 3 ? [3, 2] : [2]) {
      const span = Array.from({ length: n }, (_, k) => start + k)
      if (span.some((i) => i >= entries.length || taken.has(i))) continue
      if (
        !cndcAllowed(
          cls,
          span.map((i) => entries[i] as DeckEntry),
        )
      )
        continue
      span.forEach((i) => taken.add(i))
      starts.push(start)
      sizes.set(start, n)
      break
    }
  }
  const joined = new Set(starts.flatMap((s) => [s + 1, s + 2].slice(0, sizes.get(s)! - 1)))
  return entries.map((e, i) => (joined.has(i) ? { ...e, withPrevious: true } : e))
}

/** Of the groups where three cards may stand, about this share have three. */
const THREE_SHARE = 0.35

/**
 * CNDC while a laid-out deck is dealt (the planner puts a group at one station, `join`): how
 * many groups are still wanted, and the station dealt last — how many cards it has and how
 * many it is meant to get.
 */
export type Grouping = { pending: number; size: number; target: number }

/** As many groups as `course.cndc.groups` allows, between its least and most, drawn. */
export function startGrouping(cls: RoClass, random: () => number): Grouping | undefined {
  const limits = cls.course.cndc
  if (!limits) return undefined
  const [least, most] = limits.groups
  return { pending: least + Math.floor(random() * (most - least + 1)), size: 1, target: 1 }
}

/**
 * Whether the next card, `remaining` to deal with it, should be done at the station dealt
 * last: a group grows to its size; a new one is tried for early and often (`JOIN_EAGERNESS`), surely once
 * the cards left only just do for the groups still wanted.
 */
export function wantsJoin(grouping: Grouping, remaining: number, random: () => number): boolean {
  if (grouping.size > 1) return grouping.size < grouping.target
  return (
    grouping.pending > 0 &&
    random() < (JOIN_EAGERNESS * grouping.pending) / Math.max(1, remaining - 1)
  )
}

/**
 * How much more often than evenly a group is started: many a card does not fit where the
 * exercise before ends, so a group tried for is often not made.
 */
const JOIN_EAGERNESS = 2

/** A card has joined the station dealt last (`joined`), or started a new one. */
export function grouped(
  cls: RoClass,
  grouping: Grouping,
  joined: boolean,
  random: () => number,
): Grouping {
  if (!joined) return { ...grouping, size: 1, target: 1 }
  if (grouping.size > 1) return { ...grouping, size: grouping.size + 1 }
  const three = (cls.course.cndc?.cards ?? 2) > 2 && random() < THREE_SHARE
  return { pending: grouping.pending - 1, size: 2, target: three ? 3 : 2 }
}

/**
 * Whether `card` may join `station` — with any of the D0 cards it may be dealt with
 * (`supplementaries`), since which one is drawn after.
 */
export function joinable(
  cls: RoClass,
  station: DeckEntry[],
  card: Card,
  supplementaries: string[],
): boolean {
  const options = card.sequencing.requiresSupplementary ? supplementaries : [undefined]
  return (
    options.length > 0 &&
    options.every((supplementary) =>
      cndcAllowed(cls, [
        ...station,
        { code: card.code, ...(supplementary && { supplementary }), side: 'left', pace: 'normal' },
      ]),
    )
  )
}

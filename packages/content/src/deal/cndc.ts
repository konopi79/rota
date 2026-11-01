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
 * Whether `entries` may stand at one station, in this order: the class has CNDC, as many
 * cards as it allows, each one eligible; a leave card only last (its follow-up is the next
 * station's), a follow-up only first; a turn only if the group starts with one; no forbidden
 * pair.
 */
export function cndcAllowed(cls: RoClass, entries: DeckEntry[]): boolean {
  const limits = cls.course.cndc
  if (!limits || entries.length < 2 || entries.length > limits.cards) return false
  const cards = entries.map((e) => cardOf(cls, e.code))
  if (!cards.every(cndcEligible)) return false
  if (cards.slice(0, -1).some((c) => c.sequencing.nextOneOf)) return false
  if (cards.slice(1).some((c) => c.sequencing.onlyAfterLeave)) return false
  if (cards.some(turns) && !turns(cards[0] as Card)) return false
  return entries.slice(1).every((e, i) => !forbiddenPair(cls, entries[i] as DeckEntry, e))
}

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

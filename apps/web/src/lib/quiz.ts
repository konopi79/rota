import type { Card } from '@rota/content'

import { cardGroup } from './catalogue'

/**
 * Quiz (plan §9, R8): which card comes next and which wrong answers to offer. Pure
 * functions over the per-card answer counts kept in local storage (`lib/storage.ts`).
 */

export type CardStat = { right: number; wrong: number }
export type QuizStats = Record<string, CardStat>

/** Stats key — national and FCI codes never collide once prefixed with the ruleset. */
export const statKey = (card: Card) => `${card.ruleset}:${card.code}`

/** Known well enough: answered right more often than wrong. */
export const isMastered = (stat: CardStat | undefined) =>
  stat !== undefined && stat.right > 0 && stat.right > stat.wrong

/**
 * How likely a card is drawn next: often-missed cards the most, unseen ones next,
 * mastered ones rarely (but never never — the point is to keep them fresh).
 */
export function cardWeight(stat: CardStat | undefined): number {
  if (!stat) return 3
  const score = stat.right - 2 * stat.wrong
  if (score >= 2) return 0.5
  if (score >= 0) return 1
  return 3 + Math.min(4, -score)
}

export function pickNextCard(
  cards: Card[],
  stats: QuizStats,
  random: () => number,
  previous?: string,
): Card | undefined {
  // Never the same card twice in a row, unless it is the only one.
  const pool = cards.length > 1 ? cards.filter((c) => c.code !== previous) : cards
  const total = pool.reduce((sum, c) => sum + cardWeight(stats[statKey(c)]), 0)
  let r = random() * total
  for (const card of pool) {
    r -= cardWeight(stats[statKey(card)])
    if (r < 0) return card
  }
  return pool[pool.length - 1]
}

/**
 * The paragraph that says what to do — skipping the boilerplate that opens many national
 * descriptions ("K tomuto cviku je třeba přidat doplňkovou kartu…") and follow-up lists.
 */
export function mainDescription(card: Card): string {
  const main = card.description.filter(
    (p) => !p.startsWith('K tomuto cviku je třeba') && !p.startsWith('Další cvik v parkuru'),
  )
  return main[0] ?? card.description[0] ?? ''
}

/**
 * Wrong answers for the "three descriptions" mode: other cards of the class, preferably
 * of the same type / points (harder to tell apart), never with the same text.
 */
export function distractors(card: Card, pool: Card[], random: () => number, n = 2): Card[] {
  const text = mainDescription(card)
  const others = pool.filter((c) => c.code !== card.code && mainDescription(c) !== text)
  const shuffled = shuffle(others, random)
  const same = shuffled.filter((c) => cardGroup(c) === cardGroup(card))
  const rest = shuffled.filter((c) => cardGroup(c) !== cardGroup(card))
  const picked: Card[] = []
  for (const c of [...same, ...rest]) {
    if (picked.length === n) break
    if (!picked.some((p) => mainDescription(p) === mainDescription(c))) picked.push(c)
  }
  return picked
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j] as T, out[i] as T]
  }
  return out
}

export function recordAnswer(stats: QuizStats, card: Card, correct: boolean): QuizStats {
  const key = statKey(card)
  const stat = stats[key] ?? { right: 0, wrong: 0 }
  return {
    ...stats,
    [key]: correct ? { ...stat, right: stat.right + 1 } : { ...stat, wrong: stat.wrong + 1 },
  }
}

export function quizSummary(cards: Card[], stats: QuizStats) {
  return {
    total: cards.length,
    seen: cards.filter((c) => stats[statKey(c)]).length,
    mastered: cards.filter((c) => isMastered(stats[statKey(c)])).length,
  }
}

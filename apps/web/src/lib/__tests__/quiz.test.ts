import { describe, expect, test } from 'bun:test'
import { getCard, getClass, type Card, type RoClass } from '@rota/content'

import { cardGroup } from '../catalogue'
import {
  cardWeight,
  distractors,
  isMastered,
  mainDescription,
  pickNextCard,
  quizSummary,
  recordAnswer,
  statKey,
  type QuizStats,
} from '../quiz'

const ro2 = getClass('RO2') as RoClass
const cards = ro2.cardCodes.map((c) => getCard('CZ', c) as Card)
const card = (code: string) => getCard('CZ', code) as Card

/** Deterministic stand-in for Math.random. */
const seq = (seed = 1) => {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

describe('quiz', () => {
  test('weights: missed > unseen > seen once > mastered', () => {
    const missed = cardWeight({ right: 0, wrong: 2 })
    const unseen = cardWeight(undefined)
    const once = cardWeight({ right: 1, wrong: 0 })
    const mastered = cardWeight({ right: 3, wrong: 0 })
    expect(missed).toBeGreaterThan(unseen)
    expect(unseen).toBeGreaterThan(once)
    expect(once).toBeGreaterThan(mastered)
    expect(mastered).toBeGreaterThan(0)
  })

  test('often-missed cards come up more often; never the same card twice in a row', () => {
    const stats: QuizStats = recordAnswer(
      recordAnswer({}, card('Z-014'), false),
      card('Z-014'),
      false,
    )
    for (const c of cards.filter((c) => c.code !== 'Z-014')) {
      stats[statKey(c)] = { right: 3, wrong: 0 }
    }
    const random = seq(7)
    let hits = 0
    let previous: string | undefined
    for (let i = 0; i < 400; i++) {
      const next = pickNextCard(cards, stats, random, previous)
      expect(next?.code).not.toBe(previous)
      if (next?.code === 'Z-014') hits++
      previous = next?.code
    }
    // 1 card of 89 weighted 7 vs 0.5 → roughly one draw in eight (minus the no-repeat rule).
    expect(hits).toBeGreaterThan(20)
  })

  test('main description skips the D0 boilerplate', () => {
    expect(mainDescription(card('Z-014'))).toStartWith('V místě pro provedení cviku')
    expect(mainDescription(card('Z-001'))).toStartWith('Tým se zastaví')
  })

  test('distractors: two other cards, different texts, preferably the same group', () => {
    const random = seq(3)
    for (const c of cards) {
      const wrong = distractors(c, cards, random)
      expect(wrong).toHaveLength(2)
      const texts = new Set([c, ...wrong].map(mainDescription))
      expect(texts.size).toBe(3)
      expect(wrong.every((w) => w.code !== c.code)).toBe(true)
    }
    const typeA = distractors(card('Z-001'), cards, random)
    expect(typeA.every((w) => cardGroup(w) === 'A')).toBe(true)
  })

  test('answers and summary', () => {
    let stats: QuizStats = {}
    stats = recordAnswer(stats, card('Z-001'), true)
    stats = recordAnswer(stats, card('Z-002'), false)
    stats = recordAnswer(stats, card('Z-002'), true)
    expect(stats['CZ:Z-002']).toEqual({ right: 1, wrong: 1 })
    expect(isMastered(stats['CZ:Z-001'])).toBe(true)
    expect(isMastered(stats['CZ:Z-002'])).toBe(false)
    expect(quizSummary(cards, stats)).toEqual({ total: 89, seen: 2, mastered: 1 })
  })
})

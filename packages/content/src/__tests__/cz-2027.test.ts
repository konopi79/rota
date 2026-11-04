import { describe, expect, test } from 'bun:test'

import type { ClassId } from '../classes'
import { CZ_CARDS } from '../cz'
import { CZ_2027_CARDS } from '../cz-2027'
import { dealDeck, validateDeck, type DealOptions } from '../deal'
import { classesOf, getClass } from '../registry'
import { isNational } from '../rulesets'

/**
 * Until R22 brings in what 2027 changes, `CZ-2027` is the 2026 regulation under its own ids
 * (plan R21) — so every check that tells national from FCI must treat it as national: the
 * same decks, courses and layouts, seed by seed.
 */
describe('CZ-2027 as the 2026 regulation (R21)', () => {
  const pairs: [ClassId, ClassId][] = [
    ['RO-Z', 'RO-Z-2027'],
    ['RO1', 'RO1-2027'],
    ['RO2', 'RO2-2027'],
    ['RO3', 'RO3-2027'],
    ['RO-V', 'RO-V-2027'],
  ]

  test('a 2027 class for each national class, national, with the cards of 2026', () => {
    expect(classesOf('CZ-2027').map((c) => c.id)).toEqual(pairs.map(([, id]) => id))
    expect(isNational('CZ-2027')).toBe(true)
    expect(isNational('FCI')).toBe(false)
    expect(CZ_2027_CARDS.map((c) => c.code)).toEqual(CZ_CARDS.map((c) => c.code))
    for (const card of CZ_2027_CARDS) {
      expect(card.ruleset).toBe('CZ-2027')
      expect(card.imageSet).toBe('CZ')
    }
    // RO-V's "pouze jako poslední karta" names the 2027 class.
    expect(CZ_2027_CARDS.find((c) => c.code === 'Z-016')?.sequencing.lastOnly).toEqual([
      'RO-V-2027',
    ])
  })

  test('deals the same decks and courses as 2026, seed by seed', () => {
    let decks = 0
    for (const [old, now] of pairs) {
      const cls = getClass(old)!
      for (const competition of [false, true]) {
        for (const cndc of [false, true]) {
          for (const field of cls.course.fields ?? [undefined]) {
            for (let seed = 0; seed < 6; seed++) {
              const options: Omit<DealOptions, 'classId'> = {
                scope: 'all',
                count: cls.course.maxCards,
                equipment: ['cones', 'bowls', 'jump'],
                startSide: seed % 3 ? 'left' : 'right',
                seed,
                competition,
                cndc,
                ...(field && { field }),
              }
              const before = dealDeck({ ...options, classId: old })
              const after = dealDeck({ ...options, classId: now })
              expect(after.entries).toEqual(before.entries)
              expect(after.layout).toEqual(before.layout)
              expect(validateDeck(after)).toEqual(validateDeck(before))
              decks++
            }
          }
        }
      }
    }
    expect(decks).toBeGreaterThan(100)
  }, 120_000)
})

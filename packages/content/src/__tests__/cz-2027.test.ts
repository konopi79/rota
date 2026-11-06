import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { CZ_CARDS } from '../cz'
import { CZ_2027_CARDS, CZ_2027_CLASSES, CZ_2027_REVISED } from '../cz-2027'
import { dealDeck, validateDeck, type DealOptions } from '../deal'
import { withSupplementary } from '../deal/geometry'
import { planSides, sidesBroken } from '../deal/side-plan'
import { mulberry32 } from '../deal/prng'
import { classesOf, getCard } from '../registry'
import { isNational, RULESETS } from '../rulesets'
import { VDH_CARD_PAGES } from '../cz-2027/vdh-cards'
import { cardSchema, roClassSchema, type RoClass } from '../schema'

const card = (code: string) => getCard('CZ-2027', code)!
const cls = (id: string) => CZ_2027_CLASSES.find((c) => c.id === id)!

/** The national regulation of 2027 (plan R22): VDH 2027 taken over by the Czech club. */
describe('CZ-2027 content', () => {
  test('every card and class is valid', () => {
    for (const c of CZ_2027_CARDS) expect(cardSchema.safeParse(c).success).toBe(true)
    for (const c of CZ_2027_CLASSES) expect(roClassSchema.safeParse(c).success).toBe(true)
    expect(new Set(CZ_2027_CARDS.map((c) => c.code)).size).toBe(CZ_2027_CARDS.length)
    expect(classesOf('CZ-2027').map((c) => c.id)).toEqual([
      'RO-Z-2027',
      'RO1-2027',
      'RO2-2027',
      'RO3-2027',
      'RO-V-2027',
    ])
    expect(isNational('CZ-2027')).toBe(true)
  })

  test('the classes have the cards of VDH §5 and Anhang 3', () => {
    const count = (id: string) => cls(id).cardCodes.length
    expect(count('RO-Z-2027')).toBe(36) // B-001–036
    expect(count('RO1-2027')).toBe(36 + 30) // + 1-101–130
    expect(count('RO2-2027')).toBe(66 + 34) // + 2-201–234
    expect(count('RO3-2027')).toBe(100 + 32) // + 3-301–332
    expect(count('RO-V-2027')).toBe(76) // Anhang 3, "B-027" read as B-028
    expect(cls('RO-V-2027').cardCodes).toContain('Z-028')
    expect(cls('RO-V-2027').cardCodes).not.toContain('Z-027')
    for (const c of CZ_2027_CLASSES) {
      for (const code of [...c.cardCodes, ...c.course.supplementary]) {
        expect([c.id, code, !!getCard('CZ-2027', code)]).toEqual([c.id, code, true])
      }
    }
    expect(cls('RO-V-2027').course.supplementary).toEqual(['D0a', 'D0c', 'D0e'])
    expect(cls('RO-V-2027').course).toMatchObject({ minCards: 12, maxCards: 14 })
  })

  test('the codes that mean another exercise in 2027', () => {
    // 1-116: the double about turn is B-036 now; 1-116 "Steh – 1 Schritt vorwärts – Steh".
    expect(card('1-116').exerciseType).toBe('A')
    expect(card('1-116').name).not.toBe(getCard('CZ', '1-116')!.name)
    expect(card('Z-036').exerciseType).toBe('B')
    // 3-302: two jumps, no longer a recall after 3-301.
    expect(card('3-302').sequencing.equipment).toContain('jump')
    expect(card('3-302').sequencing.onlyAfterLeave).toBeUndefined()
    for (const c of CZ_2027_CARDS) expect(c.sequencing.nextOneOf ?? []).not.toContain('3-302')
    expect(card('3-301').sequencing.nextOneOf).toContain('2-214')
  })

  test('D0e keeps the dog on its side and turns the team', () => {
    const d0e = card('D0e')
    expect(d0e.kind).toBe('supplementary')
    expect(d0e.exerciseType).toBe('A')
    expect(d0e.sequencing.endSide).toBeUndefined()
    for (const d of ['D0a', 'D0b', 'D0c', 'D0d']) expect(card(d).sequencing.endSide).toBe('left')
    const laid = withSupplementary(card('Z-014'), d0e)
    expect(laid.geometry?.turn).toBe(180)
    expect(withSupplementary(card('Z-014'), card('D0a'))).toBe(card('Z-014'))
  })

  test('no sub-parts, no last-card rule, VDH pages, every follow-up a card', () => {
    const codes = new Set(CZ_2027_CARDS.map((c) => c.code))
    for (const c of CZ_2027_CARDS) {
      expect(c.subParts).toBeUndefined()
      expect(c.sequencing.lastOnly).toBeUndefined()
      expect(c.ruleset).toBe('CZ-2027')
      for (const next of c.sequencing.nextOneOf ?? [])
        expect([c.code, codes.has(next)]).toEqual([c.code, true])
    }
    // Unchanged cards keep their 2026 image; new ones have their own (R23).
    expect(card('Z-001').imageSet).toBe('CZ')
    expect(card('Z-033').imageSet).toBeUndefined()
  })

  test('every card ROTA draws itself links to its original VDH card, and only those', () => {
    const drawn = CZ_2027_CARDS.filter((c) => !c.imageSet).map((c) => c.code)
    expect(Object.keys(VDH_CARD_PAGES).sort()).toEqual([...drawn].sort())
  })

  test('every card has its images: the 2026 one, or our own (scripts/cards/rota)', () => {
    const cards = join(import.meta.dir, '../../../../apps/web/public/cards')
    for (const c of CZ_2027_CARDS) {
      const dir = join(cards, RULESETS[c.imageSet ?? c.ruleset].slug)
      expect([c.code, existsSync(join(dir, `${c.image}.webp`))]).toEqual([c.code, true])
      expect([c.code, existsSync(join(dir, 'thumb', `${c.image}.webp`))]).toEqual([c.code, true])
    }
  })

  test('the revised cards: new, rewritten or changed — and only those', () => {
    const before = new Map(CZ_CARDS.map((c) => [c.code, c]))
    for (const c of CZ_2027_CARDS) {
      const old = before.get(c.code)
      const same =
        !!old &&
        old.name === c.name &&
        JSON.stringify(old.description) === JSON.stringify(c.description) &&
        old.exerciseType === c.exerciseType &&
        JSON.stringify(old.geometry) === JSON.stringify(c.geometry)
      if (!same) expect([c.code, CZ_2027_REVISED.has(c.code)]).toEqual([c.code, true])
    }
    for (const code of ['Z-033', 'Z-036', '1-116', '1-126', '2-233', '3-302', '3-332', 'D0e']) {
      expect(CZ_2027_REVISED.has(code)).toBe(true)
    }
  })
})

describe('CZ-2027 side rules (VDH §5.2–5.5)', () => {
  const rule = (id: string) => cls(id).course.sides!

  test('RO1: the next card changes back, two changes to the right at most, one at least', () => {
    const r = rule('RO1-2027')
    expect(sidesBroken(r, [5, 6, 12, 13], 20, 'left')).toEqual([])
    expect(sidesBroken(r, [19], 20, 'left')).toEqual([]) // to the finish on the right
    expect(sidesBroken(r, [5, 7], 20, 'left')).toEqual(['stretch'])
    expect(sidesBroken(r, [], 20, 'left')).toEqual(['min-changes'])
    expect(sidesBroken(r, [2, 3, 8, 9, 14, 15], 20, 'left')).toEqual(['left-to-right'])
    // After a start "R" one more change to the right only.
    expect(sidesBroken(r, [0, 5, 6], 20, 'right')).toEqual([])
    expect(sidesBroken(r, [0, 5, 6, 10, 11], 20, 'right')).toEqual(['left-to-right'])
  })

  test('RO2: back by the card after next, one exercise on the right at least', () => {
    const r = rule('RO2-2027')
    expect(sidesBroken(r, [5, 7], 22, 'left')).toEqual([])
    expect(sidesBroken(r, [5, 6], 22, 'left')).toEqual(['min-right'])
    expect(sidesBroken(r, [5, 8], 22, 'left')).toEqual(['stretch'])
  })

  test('RO3: three exercises on the right at least, a third of the course at most', () => {
    const r = rule('RO3-2027')
    expect(sidesBroken(r, [3, 7], 24, 'left')).toEqual([]) // 3 on the right
    expect(sidesBroken(r, [3, 5], 24, 'left')).toEqual(['min-right'])
    expect(sidesBroken(r, [3, 13], 24, 'left')).toEqual(['max-right']) // 9 of 24
    expect(sidesBroken(r, [3, 7, 8, 12], 24, 'left')).toEqual(['back-to-back'])
  })

  test('Senioren: one change, by the first card or the last', () => {
    const r = rule('RO-V-2027')
    expect(sidesBroken(r, [0], 14, 'right')).toEqual([])
    expect(sidesBroken(r, [13], 14, 'left')).toEqual([])
    expect(sidesBroken(r, [5], 14, 'left')).toEqual(['ends'])
    expect(sidesBroken(r, [], 14, 'left')).toContain('min-changes')
  })

  test('the planner draws only patterns that keep the rule', () => {
    for (const c of CZ_2027_CLASSES) {
      const r = c.course.sides
      if (!r) continue
      const random = mulberry32(7)
      for (let i = 0; i < 300; i++) {
        for (const side of ['left', 'right'] as const) {
          const count = c.course.minCards + (i % (c.course.maxCards - c.course.minCards + 1))
          const changes = [...planSides(r, count, side, random)].sort((a, b) => a - b)
          expect([c.id, sidesBroken(r, changes, count, side)]).toEqual([c.id, []])
        }
      }
    }
  })
})

describe('CZ-2027 dealing (property test)', () => {
  const dealt = (c: RoClass, options: Partial<DealOptions>) =>
    dealDeck({
      classId: c.id,
      scope: 'all',
      count: c.course.maxCards,
      equipment: ['cones', 'bowls', 'jump'],
      startSide: 'left',
      seed: 0,
      ...options,
    })

  test('decks and courses of every class are complete and valid, laid out on each field', () => {
    let decks = 0
    let d0e = 0
    for (const c of CZ_2027_CLASSES) {
      for (const competition of [false, true]) {
        for (const field of c.course.fields ?? [undefined]) {
          for (let seed = 0; seed < 12; seed++) {
            const startSide = seed % 2 ? 'right' : 'left'
            const deck = dealt(c, { competition, seed, startSide, ...(field && { field }) })
            const errors = validateDeck(deck)
            if (errors.length) throw new Error(`${c.id} ${competition} ${seed}: ${errors}`)
            expect(deck.entries).toHaveLength(c.course.maxCards)
            expect(deck.layout?.rounds).toHaveLength(1)
            d0e += deck.entries.filter((e) => e.supplementary === 'D0e').length
            decks++
          }
        }
      }
    }
    expect(decks).toBeGreaterThan(150)
    expect(d0e).toBeGreaterThan(20)
  }, 300_000)

  test('a competition course repeats no card more than twice, D0 cards included', () => {
    for (const c of CZ_2027_CLASSES) {
      for (let seed = 0; seed < 10; seed++) {
        const deck = dealt(c, { competition: true, seed })
        const counts = new Map<string, number>()
        for (const e of deck.entries) {
          for (const code of e.supplementary ? [e.code, e.supplementary] : [e.code]) {
            counts.set(code, (counts.get(code) ?? 0) + 1)
          }
        }
        expect(Math.max(...counts.values())).toBeLessThanOrEqual(2)
      }
    }
  }, 120_000)

  test('training decks of other sizes and the cards new in a class', () => {
    for (const c of CZ_2027_CLASSES) {
      for (const scope of c.newCardCodes.length ? (['all', 'new'] as const) : (['all'] as const)) {
        for (const count of [5, 10]) {
          const deck = dealt(c, { scope, count, seed: count })
          expect(validateDeck(deck)).toEqual([])
        }
      }
    }
  }, 120_000)
})

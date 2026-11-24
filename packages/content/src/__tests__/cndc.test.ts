import { describe, expect, test } from 'bun:test'

import { getClass } from '../registry'
import { cndcAllowed, stationsOf, stationStep, stationStepLength } from '../deal/cndc'
import { customDeck, customDeckIssues, dealDeck, geometry, validateDeck } from '../deal'
import { cardOf } from '../deal/rules'
import type { DeckEntry } from '../deal'
import { EQUIPMENT, type Card } from '../schema'
import { CZ_CARDS } from '../cz'
import { CZ_2027_CARDS } from '../cz-2027'

const ro3 = getClass('RO3')!
const group = (...codes: string[]) =>
  codes.map((c): DeckEntry => {
    const [code, supplementary] = c.split('+') as [string, string | undefined]
    return { code, ...(supplementary && { supplementary }), side: 'left', pace: 'normal' }
  })
const allowed = (...codes: string[]) => cndcAllowed(ro3, group(...codes))

describe('CNDC — several cards at one station (R18)', () => {
  test('groups seen on real RO3 courses are allowed', () => {
    // ROPLAN and walked course plans, 2024–2025.
    expect(allowed('1-124', '3-305', '3-304')).toBe(true)
    expect(allowed('1-120', '3-317')).toBe(true)
    expect(allowed('3-302+D0c', '2-202')).toBe(true)
    expect(allowed('2-216', '2-201', '2-206')).toBe(true)
    expect(allowed('3-321', 'Z-011')).toBe(true)
    expect(allowed('3-303', '3-318', '2-228')).toBe(true)
  })

  test('a pair that is a card of a higher class is not (Směrnice §1.1.6)', () => {
    // "např. 105/112 představuje 105/205"
    expect(allowed('1-105', '1-112')).toBe(false)
    // From a stop a turn while walking: "Stop – obrat vpravo o 90° – vpřed".
    expect(allowed('1-105', 'Z-006')).toBe(false)
    // Two turns from a stop.
    expect(allowed('1-105', 'Z-030')).toBe(false)
    // A position after a static exercise: "Stop – vstaň – sedni".
    expect(allowed('2-209', 'Z-001')).toBe(false)
  })

  test('after a dynamic exercise a step forward, before one on the move a mezikrok (řád p. 16)', () => {
    const step = (codes: string) => {
      const [before, next] = group(...codes.split(' ')) as [DeckEntry, DeckEntry]
      return stationStep(ro3, before, next)
    }
    expect(step('3-326 3-305')).toBe('step')
    expect(step('3-317 3-305')).toBe('free')
    // "A nebo B": the D0 card decides.
    expect(step('3-302+D0c 3-305')).toBe('step')
    expect(step('3-302+D0a 3-305')).toBe('free')
    // "Stop – vstaň – sedni" then "Zastavit – lehni – odchod": the dog sits, the team stands,
    // and 2-212 starts on the move — one mezikrok (a handler's feedback, 2026-11-23).
    expect(step('2-210 2-212')).toBe('interstep')
    expect(step('3-305 3-311')).toBe('interstep')
    // After a dynamic exercise its own step forward does.
    expect(step('3-326 2-212')).toBe('step')
    expect(stationStepLength('free')).toBe(0)
    expect(stationStepLength('interstep')).toBe(geometry.CNDC_STEP)
  })

  test('the cards that start on the move, as the regulation words them', () => {
    const walking = (cards: Card[]) =>
      cards.filter((c) => c.sequencing.startsWalking).map((c) => c.code)
    // "za chůze", "aniž by se zastavil", "rovnou lehá", "aniž by si předtím sedl", …
    expect(walking(CZ_CARDS)).toEqual([
      ...['Z-006', 'Z-007', 'Z-008', 'Z-009', 'Z-010', '1-102', '1-109', '1-116', '1-118'],
      ...['1-123', '2-208', '2-212', '2-219', '3-303', '3-306', '3-307', '3-310', '3-311'],
      ...['3-312', '3-315', '3-318', '3-327'],
    ])
    // 1-116 is another exercise in 2027 (its double about turn is Z-036).
    expect(walking(CZ_2027_CARDS)).toEqual([
      ...['Z-006', 'Z-007', 'Z-008', 'Z-009', 'Z-010', 'Z-033', 'Z-034', 'Z-036', '1-102'],
      ...['1-109', '1-118', '1-123', '1-127', '1-128', '1-129', '1-130', '2-208', '2-212'],
      ...['2-219', '2-234', '3-303', '3-306', '3-307', '3-310', '3-311', '3-312', '3-315'],
      ...['3-318', '3-327', '3-328', '3-329', '3-330', '3-331', '3-332'],
    ])
  })

  test('a change of direction first, a leave card last, a follow-up first', () => {
    expect(allowed('3-305', '1-105')).toBe(false)
    expect(allowed('1-105', '3-305')).toBe(true)
    expect(allowed('3-307', '3-305')).toBe(false)
    expect(allowed('3-305', '3-307')).toBe(true)
    expect(allowed('3-305', '2-215')).toBe(false)
  })

  test('no equipment, pace or long exercises in a group; at most as many cards as allowed', () => {
    expect(allowed('Z-018', '3-305')).toBe(false)
    expect(allowed('3-305', 'Z-016')).toBe(false)
    expect(allowed('3-305', '1-107')).toBe(false)
    expect(allowed('1-124', '3-305', '3-304', '2-228')).toBe(false)
    // RO1 and RO-V: two cards; RO-Z: none.
    expect(cndcAllowed(getClass('RO1')!, group('1-124', '1-125', 'Z-004'))).toBe(false)
    expect(cndcAllowed(getClass('RO-Z')!, group('Z-004', 'Z-005'))).toBe(false)
  })

  test.each(['RO1', 'RO2', 'RO3', 'RO-V'] as const)(
    '%s: a course dealt with CNDC laid out with its groups, valid, within the limits',
    (classId) => {
      const cls = getClass(classId)!
      const most = cls.course.cndc!.groups[1]
      let groups = 0
      const seeds = 40
      for (let seed = 0; seed < seeds; seed++) {
        const deck = dealDeck({
          classId,
          scope: 'all',
          count: cls.course.maxCards,
          equipment: [...EQUIPMENT],
          startSide: seed % 2 ? 'left' : 'right',
          competition: seed % 3 === 0,
          seed,
          cndc: true,
        })
        expect(validateDeck(deck)).toEqual([])
        expect(deck.layout).toBeDefined()
        const grouped = stationsOf(deck.entries).filter(([a, b]) => b > a)
        expect(grouped.length).toBeLessThanOrEqual(most)
        groups += grouped.length
      }
      // Groups come about on most courses (fewer than wanted: done where the exercise before
      // ends, many a card does not fit there).
      expect(groups / seeds).toBeGreaterThan(0.8)
    },
    60_000,
  )

  test.each(['RO2', 'RO3'] as const)(
    '%s: a deck longer than a course, not laid out, is the same deck grouped',
    (classId) => {
      for (let seed = 0; seed < 20; seed++) {
        const options = {
          classId,
          scope: 'all' as const,
          count: 40,
          equipment: [...EQUIPMENT],
          startSide: 'left' as const,
          seed,
        }
        const plain = dealDeck(options)
        const deck = dealDeck({ ...options, cndc: true })
        expect(validateDeck(deck)).toEqual([])
        expect(deck.layout).toBeUndefined()
        expect(deck.entries.map((e) => e.code)).toEqual(plain.entries.map((e) => e.code))
        expect(stationsOf(deck.entries).some(([a, b]) => b > a)).toBe(true)
      }
    },
    60_000,
  )

  test('a card of a CNDC is done where the exercise before it ends, the next station further', () => {
    const ro3 = getClass('RO3')!
    for (let seed = 0; seed < 20; seed++) {
      const deck = dealDeck({
        classId: 'RO3',
        scope: 'all',
        count: 24,
        equipment: [...EQUIPMENT],
        startSide: 'left',
        seed,
        competition: true,
        cndc: true,
      })
      const i = deck.entries.findIndex((e) => e.withPrevious)
      if (i < 0) continue
      const entry = deck.entries[i]!
      const before = deck.entries[i - 1]!
      const exit = geometry.shapeOf(cardOf(ro3, before.code), before.at!, before.side, false).exit
      const step = stationStepLength(stationStep(ro3, before, entry))
      const walk = geometry.walkOf(exit, entry.at!)!
      expect(walk.ahead).toBeCloseTo(step, 6)
      expect(walk.across).toBeCloseTo(0, 6)
      // Moved off its place, it is caught.
      const moved = {
        ...deck,
        entries: deck.entries.map((e, k) =>
          k === i ? { ...e, at: { ...e.at!, x: e.at!.x + 0.5 } } : e,
        ),
      }
      expect(validateDeck(moved).some((e) => e.includes('not where the exercise before'))).toBe(
        true,
      )
    }
    // After a CNDC with a dynamic exercise the next station is 4–6 m on, not 3–5.
    const approach = geometry.approachOf(undefined, undefined)
    expect(geometry.afterDynamicStation(approach)).toMatchObject({ min: 4, max: 6 })
  }, 60_000)

  test('a hand-made course is checked up to the level asked for (plan §12)', () => {
    const issues = (
      classId: 'RO-Z' | 'RO1' | 'RO3',
      codes: string[],
      level: { guidelines?: boolean; strict?: boolean } = {},
    ) =>
      customDeckIssues(
        customDeck(
          classId,
          'left',
          codes.map((c) => {
            const [code, supplementary] = c.replace(/^\+/, '').split('.') as [string, string?]
            return {
              code,
              ...(supplementary && { supplementary }),
              ...(c.startsWith('+') && { withPrevious: true as const }),
            }
          }),
        ),
        level,
      ).flatMap((i) =>
        i.rule === 'cndc'
          ? [`${i.index}:${i.reason}:${i.level}`]
          : i.rule === 'cndc-stations'
            ? [`stations:${i.max}`]
            : [],
      )
    // The regulation: no CNDC in RO-Z, at most three cards to a station.
    expect(issues('RO-Z', ['Z-001', '+Z-003'])).toEqual(['1:no-cndc:rules'])
    expect(issues('RO3', ['3-305', '+3-304', '+Z-003', '+Z-002'])).toContain('3:too-many:rules')
    // The guidelines: RO1 two cards, a change of direction first, 105/112.
    expect(issues('RO1', ['Z-001', '+Z-003', '+1-109'])).toEqual([])
    expect(issues('RO1', ['Z-001', '+Z-003', '+1-109'], { guidelines: true })).toEqual([
      '2:too-many:guidelines',
    ])
    expect(issues('RO1', ['Z-003', '+Z-006'], { guidelines: true })).toEqual([
      '1:turn-first:guidelines',
    ])
    expect(issues('RO1', ['1-105', '+1-112'], { guidelines: true })).toEqual([
      '1:higher-class:guidelines',
    ])
    // RO1: at most three such stations by the guidelines.
    const four = ['Z-003', '+Z-004', 'Z-006', 'Z-003', '+Z-004', 'Z-006', 'Z-003', '+Z-004']
    expect(issues('RO1', [...four, 'Z-006', 'Z-003', '+Z-004'], { guidelines: true })).toEqual([
      'stations:3',
    ])
    // The safe side only when strict: a leave card last, no equipment.
    expect(issues('RO3', ['2-211', '+3-305', '2-213'], { guidelines: true })).toEqual([])
    expect(issues('RO3', ['2-211', '+3-305', '2-213'], { strict: true })).toEqual([
      '0:leave-last:strict',
    ])
    expect(issues('RO3', ['Z-018', '+3-305'], { strict: true })).toContain('0:equipment:strict')
    // A course dealt with CNDC passes the strictest check.
    const deck = dealDeck({
      classId: 'RO3',
      scope: 'all',
      count: 24,
      equipment: [...EQUIPMENT],
      startSide: 'left',
      seed: 3,
      competition: true,
      cndc: true,
    })
    const order = deck.entries.map(({ code, supplementary, withPrevious }) => ({
      code,
      ...(supplementary && { supplementary }),
      ...(withPrevious && { withPrevious }),
    }))
    expect(deck.entries.some((e) => e.withPrevious)).toBe(true)
    expect(
      customDeckIssues(customDeck('RO3', 'left', order), { strict: true }).filter((i) =>
        i.rule.startsWith('cndc'),
      ),
    ).toEqual([])
  })

  test('a group in a deck dealt without CNDC, or one the class does not allow, is caught', () => {
    const deck = dealDeck({
      classId: 'RO3',
      scope: 'all',
      count: 24,
      equipment: [],
      startSide: 'left',
      seed: 1,
    })
    const grouped = {
      ...deck,
      entries: deck.entries.map((e, i) => (i === 1 ? { ...e, withPrevious: true as const } : e)),
    }
    expect(validateDeck(grouped).some((e) => e.includes('without CNDC'))).toBe(true)
  })
})

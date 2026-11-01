import { describe, expect, test } from 'bun:test'

import { getClass } from '../registry'
import { cndcAllowed, stationsOf, stepForwardAfter } from '../deal/cndc'
import { dealDeck, geometry, validateDeck } from '../deal'
import { cardOf } from '../deal/rules'
import type { DeckEntry } from '../deal'
import { EQUIPMENT } from '../schema'

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

  test('after a dynamic exercise a step forward (řád p. 16)', () => {
    const step = (code: string) => stepForwardAfter(ro3, group(code)[0] as DeckEntry)
    expect(step('3-326')).toBe(true)
    expect(step('3-317')).toBe(false)
    // "A nebo B": the D0 card decides.
    expect(step('3-302+D0c')).toBe(true)
    expect(step('3-302+D0a')).toBe(false)
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
      const step = stepForwardAfter(ro3, before) ? geometry.CNDC_STEP : 0
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

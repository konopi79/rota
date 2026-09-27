import { describe, expect, test } from 'bun:test'

import type { ClassId } from '../classes'
import { dealDeck, validateDeck, type Deck, type DealOptions, type DeckEntry } from '../deal'
import { CLASSES } from '../registry'
import { EQUIPMENT, type Equipment } from '../schema'

const base: DealOptions = {
  classId: 'RO3',
  scope: 'all',
  count: 3,
  equipment: [...EQUIPMENT],
  startSide: 'left',
  seed: 1,
}
const e = (code: string, extra: Partial<DeckEntry> = {}): DeckEntry => ({
  code,
  side: 'left',
  pace: 'normal',
  ...extra,
})
const check = (entries: DeckEntry[], options: Partial<DealOptions> = {}) =>
  validateDeck({ options: { ...base, ...options, count: entries.length }, entries })

describe('validateDeck — each rule', () => {
  test('accepts a plain performable deck', () => {
    expect(check([e('Z-001'), e('Z-006'), e('1-101')])).toEqual([])
  })

  test('card outside the class', () => {
    expect(check([e('2-201')], { classId: 'RO1' })).toEqual(['#1 2-201: not in class RO1'])
  })

  test('same card twice in a row, main card dealt twice', () => {
    expect(check([e('Z-006'), e('Z-006')])).toContain('#2 Z-006: same card twice in a row')
    expect(check([e('Z-006'), e('Z-007'), e('Z-006')])).toContain('#3 Z-006: dealt twice')
  })

  test('supplementary card: required, allowed in the class, not on other cards', () => {
    expect(check([e('Z-014')])).toContain('#1 Z-014: missing its D0 card')
    expect(check([e('Z-014', { supplementary: 'D0b' })], { classId: 'RO-V' })).toContain(
      '#1 Z-014: D0b not allowed in RO-V',
    )
    expect(check([e('Z-001', { supplementary: 'D0a' })])).toContain(
      '#1 Z-001: has a D0 card it does not take',
    )
  })

  test('leave card → follow-up from its list; follow-ups never on their own', () => {
    expect(check([e('2-211'), e('2-215')])).toEqual([])
    expect(check([e('2-211'), e('Z-001')])).toContain('#2 Z-001: not a follow-up of the leave card')
    expect(check([e('Z-001'), e('2-215')])).toContain(
      '#2 2-215: follow-up card without a leave card',
    )
    expect(check([e('Z-001'), e('2-211')])).toContain('#2 2-211: leave card without follow-up')
  })

  test('follow-ups may repeat after different leave cards', () => {
    expect(check([e('2-211'), e('2-215'), e('2-212'), e('2-215')])).toEqual([])
  })

  test('"z poslední pozice" cards must follow a static exercise', () => {
    expect(check([e('Z-001'), e('2-218'), e('2-215')])).toEqual([])
    expect(check([e('Z-006'), e('2-218'), e('2-215')])).toContain(
      '#2 2-218: must follow a static exercise',
    )
    // An AB exercise ends static only with D0a/D0b.
    expect(check([e('Z-014', { supplementary: 'D0c' }), e('2-218'), e('2-215')])).toContain(
      '#2 2-218: must follow a static exercise',
    )
    expect(check([e('Z-014', { supplementary: 'D0a' }), e('2-218'), e('2-215')])).toEqual([])
  })

  test('pace: tracked per card, a pace card must change it, a static exercise resets it', () => {
    expect(
      check([e('Z-015'), e('Z-006', { pace: 'slow' }), e('Z-017', { pace: 'slow' }), e('Z-007')]),
    ).toEqual([])
    expect(check([e('Z-017')])).toContain('#1 Z-017: pace is already normal')
    expect(check([e('Z-015'), e('Z-006')])).toContain('#2 Z-006: pace should be slow')
    expect(check([e('Z-015'), e('Z-001', { pace: 'slow' }), e('Z-006')])).toEqual([])
  })

  test('side: tracked across side changes', () => {
    expect(
      check([e('1-125'), e('Z-006', { side: 'right' }), e('1-124', { side: 'right' })]),
    ).toEqual([])
    expect(check([e('1-125'), e('Z-006')])).toContain('#2 Z-006: side should be right')
    expect(check([e('Z-006', { side: 'right' })], { startSide: 'right' })).toEqual([])
  })

  test('RO-V last-only cards', () => {
    expect(check([e('Z-001'), e('Z-016')], { classId: 'RO-V' })).toEqual([])
    expect(check([e('Z-016'), e('Z-001', { pace: 'fast' })], { classId: 'RO-V' })).toContain(
      '#1 Z-016: allowed only as the last card in RO-V',
    )
  })

  test('equipment and new-cards-only scope', () => {
    expect(check([e('Z-018')], { equipment: [] })).toContain(
      '#1 Z-018: needs equipment not at hand',
    )
    expect(check([e('Z-001')], { classId: 'RO2', scope: 'new' })).toContain(
      '#1 Z-001: not a new card of RO2',
    )
    // Follow-ups come from the whole class even when only new cards are dealt.
    expect(check([e('3-301'), e('2-215')], { scope: 'new' })).toEqual([])
  })
})

describe('dealDeck', () => {
  const equipmentSets: Equipment[][] = [[], ['cones'], [...EQUIPMENT]]

  test('the same seed deals the same deck', () => {
    const options = { ...base, count: 20, seed: 42 }
    expect(dealDeck(options)).toEqual(dealDeck(options))
    expect(dealDeck(options).entries).not.toEqual(dealDeck({ ...options, seed: 43 }).entries)
  })

  test('every dealt deck is performable and complete (property test)', () => {
    let decks = 0
    for (const cls of CLASSES) {
      for (const scope of ['all', 'new'] as const) {
        if (scope === 'new' && cls.newCardCodes.length === 0) continue
        for (const equipment of equipmentSets) {
          for (const startSide of ['left', 'right'] as const) {
            for (let seed = 0; seed < 60; seed++) {
              const count =
                scope === 'new' ? Math.min(10, cls.course.maxCards) : cls.course.maxCards
              const deck: Deck = dealDeck({
                classId: cls.id as ClassId,
                scope,
                count,
                equipment,
                startSide,
                seed,
              })
              const errors = validateDeck(deck)
              if (errors.length) throw new Error(`${cls.id}/${scope}/seed ${seed}: ${errors}`)
              expect(deck.entries).toHaveLength(count)
              decks++
            }
          }
        }
      }
    }
    expect(decks).toBeGreaterThan(2000)
  })

  test('every card of a class eventually gets dealt', () => {
    for (const cls of CLASSES) {
      const seen = new Set<string>()
      for (let seed = 0; seed < 400; seed++) {
        const deck = dealDeck({
          ...base,
          classId: cls.id as ClassId,
          count: cls.course.maxCards,
          seed,
        })
        for (const entry of deck.entries) seen.add(entry.code)
      }
      expect([...cls.cardCodes].filter((c) => !seen.has(c))).toEqual([])
    }
  })

  test('a pool too small for the request returns fewer cards', () => {
    // RO-Z without equipment has 25 usable cards; ask for more.
    const deck = dealDeck({ ...base, classId: 'RO-Z', equipment: [], count: 40 })
    expect(deck.entries.length).toBeLessThan(40)
    expect(validateDeck(deck)).toEqual([])
  })
})

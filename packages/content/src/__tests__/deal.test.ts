import { describe, expect, test } from 'bun:test'

import type { ClassId } from '../classes'
import {
  dealDeck,
  finishSide,
  validateDeck,
  type Deck,
  type DealOptions,
  type DeckEntry,
} from '../deal'
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

  test('side: every D0 card ends at the left leg', () => {
    const right = { startSide: 'right' } as const
    expect(check([e('Z-014', { side: 'right', supplementary: 'D0a' }), e('Z-006')], right)).toEqual(
      [],
    )
    expect(
      check(
        [e('Z-014', { side: 'right', supplementary: 'D0c' }), e('Z-006', { side: 'right' })],
        right,
      ),
    ).toContain('#2 Z-006: side should be left')
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

describe('validateDeck — FCI rules', () => {
  // Sequencing only — the field layout has its own tests (layout.test.ts).
  const fci = (entries: DeckEntry[], options: Partial<DealOptions> = {}) =>
    check(entries, { classId: 'FCI-ROB', ...options }).filter((e) => e !== 'no field layout')

  test('slow/fast pace: only the flowing 105–113 or another pace card', () => {
    expect(
      fci([e('116'), e('105', { pace: 'slow' }), e('118', { pace: 'slow' }), e('101')]),
    ).toEqual([])
    expect(fci([e('116'), e('101', { pace: 'slow' })])).toContain(
      '#2 101: cannot be performed in slow pace',
    )
    expect(fci([e('117'), e('116', { pace: 'fast' })])).toEqual([])
  })

  test('417 only with the dog left, then the dog is right', () => {
    expect(fci([e('417'), e('101', { side: 'right' })])).toEqual([])
    expect(fci([e('417', { side: 'right' })], { startSide: 'right' })).toContain(
      '#1 417: only with the dog left',
    )
  })

  test('cards returning the dog to the left', () => {
    expect(fci([e('310'), e('209', { side: 'right' }), e('101')])).toEqual([])
  })

  test('recall cards: optional after 319/408/409, never on their own', () => {
    expect(fci([e('319'), e('321'), e('101')])).toEqual([])
    expect(fci([e('319'), e('101')])).toEqual([])
    expect(fci([e('101'), e('321')])).toContain('#2 321: follow-up card without a leave card')
  })

  test('a card at most twice', () => {
    expect(fci([e('319'), e('321'), e('408'), e('321'), e('409'), e('321')])).toContain(
      '#6 321: more than 2 times',
    )
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
    // FCI decks are laid out on the field too (~20 ms each).
  }, 60_000)

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
  }, 60_000)

  test('a pool too small for the request returns fewer cards', () => {
    // RO-Z without equipment has 25 usable cards; ask for more.
    const deck = dealDeck({ ...base, classId: 'RO-Z', equipment: [], count: 40 })
    expect(deck.entries.length).toBeLessThan(40)
    expect(validateDeck(deck)).toEqual([])
  })
})

describe('competition courses (R7)', () => {
  const competition = (classId: ClassId, seed: number, count?: number) => {
    const cls = CLASSES.find((c) => c.id === classId)
    return dealDeck({
      classId,
      scope: 'all',
      count: count ?? cls?.course.maxCards ?? 0,
      equipment: [...EQUIPMENT],
      startSide: seed % 2 ? 'left' : 'right',
      seed,
      competition: true,
    })
  }

  test('FCI courses always meet the point mix (≥ 7 four-point, ≥ 5 three-point)', () => {
    // 400 courses: each one is laid out on the field too (~25 ms).
    for (let seed = 0; seed < 200; seed++) {
      for (const count of [18, 20]) {
        const deck = competition('FCI-ROB', seed, count)
        expect(deck.entries).toHaveLength(count)
        const errors = validateDeck(deck)
        if (errors.length) throw new Error(`seed ${seed}/${count}: ${errors}`)
      }
    }
  }, 60_000)

  test('every class yields a valid competition course', () => {
    for (const cls of CLASSES) {
      for (let seed = 0; seed < 100; seed++) {
        const deck = competition(cls.id as ClassId, seed)
        expect(validateDeck(deck)).toEqual([])
      }
    }
  }, 60_000)

  test('the validator catches a missing point mix and a wrong course size', () => {
    // A plain training deck rarely meets the mix (~4 %) — find one that misses it.
    const missesMix = Array.from({ length: 50 }, (_, seed) =>
      dealDeck({
        classId: 'FCI-ROB',
        scope: 'all',
        count: 20,
        equipment: [...EQUIPMENT],
        startSide: 'left',
        seed,
      }),
    )
      .map((deck) => validateDeck({ ...deck, options: { ...deck.options, competition: true } }))
      .find((errors) => errors.length > 0)
    expect(missesMix?.some((e) => e.includes('-point cards'))).toBe(true)
    const short = competition('RO1', 1, 10)
    expect(validateDeck(short)).toContain('course of 10 cards, RO1 needs 18–20')
  })

  const SIDE_CHANGES = new Set(['1-123', '1-124', '1-125', '2-232', '3-325', '3-326', '3-327'])
  /**
   * The side errors of a course of `count` cards: `at` puts cards at positions (1-based),
   * the rest alternate Z-006 / Z-007 (their "dealt twice" errors are filtered out).
   */
  const sideErrors = (
    classId: ClassId,
    startSide: 'left' | 'right',
    count: number,
    at: Record<number, string>,
  ) => {
    let side = startSide
    const entries = Array.from({ length: count }, (_, i): DeckEntry => {
      const [code = '', supplementary] = (at[i + 1] ?? (i % 2 ? 'Z-007' : 'Z-006')).split('+')
      const entry = e(code, { side, supplementary })
      if (supplementary) side = 'left'
      else if (SIDE_CHANGES.has(code)) side = side === 'left' ? 'right' : 'left'
      return entry
    })
    return check(entries, { classId, startSide, competition: true }).filter((m) =>
      /side|right|pattern|"R"/.test(m),
    )
  }
  const RO1_PATTERN = 'side changes do not follow the RO1 pattern'

  test('RO1: one side change — from a start "R" or to the finish', () => {
    expect(sideErrors('RO1', 'right', 20, { 1: '1-124' })).toEqual([])
    expect(sideErrors('RO1', 'left', 20, { 20: '1-125' })).toEqual([])
    expect(sideErrors('RO1', 'left', 20, {})).toEqual([RO1_PATTERN])
    expect(sideErrors('RO1', 'right', 20, { 2: '1-124' })).toEqual([
      'start "R": the side must change by card 1',
    ])
    expect(sideErrors('RO1', 'left', 20, { 19: '1-125' })).toEqual([
      '#19: to the finish on the right only from the last 1',
    ])
    expect(sideErrors('RO1', 'right', 20, { 1: '1-124', 20: '1-125' })).toEqual([RO1_PATTERN])
    expect(sideErrors('RO1', 'left', 20, { 5: '1-125', 6: '1-124', 20: '1-123' })).toEqual([
      '#5: no stretch on the right mid-course in RO1',
    ])
  })

  test('RO2: start or finish plus a change straight back, or start and finish', () => {
    const mid = { 5: '1-125', 6: '2-232' }
    expect(sideErrors('RO2', 'left', 22, { ...mid, 22: '1-124' })).toEqual([])
    expect(sideErrors('RO2', 'right', 22, { 1: '1-124', ...mid })).toEqual([])
    expect(sideErrors('RO2', 'right', 22, { 1: '1-124', 22: '1-125' })).toEqual([])
    expect(sideErrors('RO2', 'left', 22, { 22: '1-124' })).toEqual([
      'side changes do not follow the RO2 pattern',
    ])
    expect(sideErrors('RO2', 'left', 22, { 5: '1-125', 7: '2-232', 22: '1-124' })).toEqual([
      '#5: more than 0 exercises on the right',
    ])
  })

  test('RO3: up to card 2 from the start, one exercise on the right mid-course', () => {
    expect(sideErrors('RO3', 'right', 24, { 2: '3-327', 6: '1-125', 8: '2-232' })).toEqual([])
    expect(sideErrors('RO3', 'left', 24, { 6: '1-125', 8: '2-232', 23: '3-327' })).toEqual([])
    expect(sideErrors('RO3', 'right', 24, { 3: '3-327', 6: '1-125', 8: '2-232' })).toEqual([
      'start "R": the side must change by card 2',
    ])
  })

  test('on a national course a D0 card does not take the dog back to the left', () => {
    expect(sideErrors('RO1', 'right', 20, { 1: 'Z-014+D0a' })).toContain(
      '#1 Z-014: its D0 card changes the side',
    )
  })

  const courseErrors = (classId: ClassId, entries: DeckEntry[], about: RegExp) =>
    check(entries, { classId, competition: true }).filter((m) => about.test(m))

  test('national course: cards repeat only as often as the guidelines allow', () => {
    const z = (code: string, supplementary?: string) => e(code, { supplementary })
    const stops = [z('Z-001'), z('Z-006'), z('Z-001'), z('Z-007'), z('Z-001')]
    expect(courseErrors('RO-Z', stops, /times/)).toEqual([])
    expect(courseErrors('RO-Z', [...stops, z('Z-008'), z('Z-001')], /times/)).toEqual([
      'Z-001: 4 times, at most 3',
    ])
    const sits = ['D0a', 'D0b', 'D0a', 'D0a'].flatMap((d) => [z('Z-014', d), z('Z-006')])
    // Z-014 four times is fine in RO-Z; D0a three times and Z-006 four times are not.
    expect(courseErrors('RO-Z', sits, /times/)).toEqual([
      'D0a: 3 times, at most 2',
      'Z-006: 4 times, at most 3',
    ])
    expect(courseErrors('RO1', [z('1-101'), z('Z-006'), z('1-101')], /times/)).toEqual([
      '1-101: 2 times, at most 1',
    ])
  })

  test('national course: required exercises, each filled by a different card', () => {
    const missing = (classId: ClassId, codes: string[]) =>
      courseErrors(
        classId,
        codes.map((c) => e(c)),
        /required/,
      ).length
    // RO-Z: a figure, Z-004/Z-005, a předsednutí.
    expect(missing('RO-Z', ['Z-018', 'Z-004'])).toBe(1)
    // RO2: 2-225 is a turn and a stand — it cannot count for both…
    const ro2 = ['2-213', '2-217', '2-201', '2-202']
    expect(missing('RO2', [...ro2, '2-225'])).toBe(1)
    // …but with 2-203 for the turn it is the stand (found whichever card comes first).
    expect(missing('RO2', [...ro2, '2-225', '2-203'])).toBe(0)
    expect(missing('RO2', [...ro2, '2-203', '2-225'])).toBe(0)
  })

  test('national course: RO-Z about half static', () => {
    const dynamic = ['Z-006', 'Z-007', 'Z-008', 'Z-009', 'Z-011', 'Z-012'].map((c) => e(c))
    expect(courseErrors('RO-Z', dynamic, /static/)).toEqual(['0 static of 6, about half needed'])
    const mixed = [...dynamic.slice(0, 4), e('Z-001'), e('Z-002')]
    expect(courseErrors('RO-Z', mixed, /static/)).toEqual([])
  })

  test('national courses use the repeats the guidelines allow', () => {
    const repeated = Array.from({ length: 100 }, (_, seed) => competition('RO1', seed)).filter(
      (deck) => new Set(deck.entries.map((x) => x.code)).size < deck.entries.length,
    )
    expect(repeated.length).toBeGreaterThan(10)
  })

  test('national courses follow the side patterns of the guidelines (property test)', () => {
    for (const classId of ['RO1', 'RO2', 'RO3'] as const) {
      const shapes = new Set<string>()
      for (let seed = 0; seed < 300; seed++) {
        const deck = competition(classId, seed)
        const errors = validateDeck(deck)
        if (errors.length) throw new Error(`${classId}/seed ${seed}: ${errors}`)
        expect(deck.entries).toHaveLength(deck.options.count)
        const changes = deck.entries.filter((x) => SIDE_CHANGES.has(x.code)).length
        shapes.add(`${deck.options.startSide}/${finishSide(deck)}/${changes}`)
      }
      // Every pattern comes up: RO1 start "R" or finish; RO2/RO3 also the mid-course ones.
      expect(shapes.size).toBe(classId === 'RO1' ? 2 : 3)
    }
  })
})

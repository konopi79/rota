import { describe, expect, test } from 'bun:test'

import { customDeck, customDeckIssues, dealDeck, validateDeck } from '../deal'
import { EQUIPMENT } from '../schema'

const rules = (deck: ReturnType<typeof customDeck>, guidelines = false) =>
  customDeckIssues(deck, { guidelines }).map((i) => `${'index' in i ? i.index : '-'} ${i.rule}`)

describe('customDeck', () => {
  test('keeps the order and tracks pace and side like the dealer', () => {
    const deck = customDeck('RO1', 'left', [
      { code: 'Z-015' },
      { code: 'Z-001' },
      { code: '1-125' },
      { code: 'Z-006' },
      { code: 'Z-014', supplementary: 'D0c' },
      { code: 'Z-007' },
    ])
    expect(deck.entries.map((e) => [e.code, e.pace, e.side])).toEqual([
      ['Z-015', 'normal', 'left'],
      ['Z-001', 'slow', 'left'],
      // Z-001 is static: the pace is back to normal.
      ['1-125', 'normal', 'left'],
      ['Z-006', 'normal', 'right'],
      ['Z-014', 'normal', 'right'],
      // Every D0 card ends at the left leg.
      ['Z-007', 'normal', 'left'],
    ])
    expect(deck.entries[4]?.supplementary).toBe('D0c')
    expect(deck.layout).toBeUndefined()
  })

  test('a performable order has no issues — every dealt deck replayed by hand', () => {
    for (const classId of ['RO-Z', 'RO2', 'RO3', 'RO-V', 'FCI-ROB'] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const dealt = dealDeck({
          classId,
          scope: 'all',
          count: 20,
          equipment: [...EQUIPMENT],
          startSide: seed % 2 ? 'left' : 'right',
          seed,
        })
        const deck = customDeck(classId, dealt.options.startSide, dealt.entries)
        expect(deck.entries.map(({ side, pace }) => ({ side, pace }))).toEqual(
          dealt.entries.map(({ side, pace }) => ({ side, pace })),
        )
        expect(customDeckIssues(deck)).toEqual([])
      }
    }
  })
})

describe('customDeckIssues', () => {
  test('reports the broken rule at its card, with what would fix it', () => {
    const deck = customDeck('RO2', 'left', [{ code: '2-211' }, { code: 'Z-001' }])
    expect(customDeckIssues(deck)).toEqual([
      {
        index: 1,
        code: 'Z-001',
        rule: 'not-follow-up',
        leave: '2-211',
        oneOf: ['2-213', '2-215', '2-216', '2-214'],
      },
    ])
  })

  test('names the leave cards a recall card belongs to, within the class', () => {
    const [issue] = customDeckIssues(customDeck('RO2', 'left', [{ code: '2-215' }]))
    expect(issue?.rule).toBe('follow-up-without-leave')
    const leaveCards = issue?.rule === 'follow-up-without-leave' ? issue.leaveCards : []
    expect(leaveCards).toContain('2-211')
    expect(leaveCards.every((c) => c.startsWith('2-'))).toBe(true)
  })

  test('a leave card at the end asks for its follow-up', () => {
    expect(rules(customDeck('RO2', 'left', [{ code: 'Z-001' }, { code: '2-211' }]))).toEqual([
      '1 leave-without-follow-up',
    ])
  })

  test('the same card twice is fine on a national course, FCI allows two', () => {
    const twice = [{ code: 'Z-001' }, { code: 'Z-006' }, { code: 'Z-001' }]
    expect(rules(customDeck('RO1', 'left', twice))).toEqual([])
    expect(validateDeck(customDeck('RO1', 'left', twice))).toContain('#3 Z-001: dealt twice')

    const fci = ['101', '102', '101', '103', '101'].map((code) => ({ code }))
    expect(rules(customDeck('FCI-ROB', 'left', fci))).toEqual(['4 max-repeats'])
  })

  test('D0 cards: missing, not allowed in the class, or on a card that takes none', () => {
    expect(
      rules(
        customDeck('RO-V', 'left', [
          { code: 'Z-014' },
          { code: 'Z-001' },
          { code: 'Z-014', supplementary: 'D0b' },
          { code: 'Z-006', supplementary: 'D0a' },
        ]),
      ),
    ).toEqual([
      '0 missing-supplementary',
      '2 supplementary-not-allowed',
      '3 unexpected-supplementary',
    ])
  })

  test('cards outside the class or unknown codes', () => {
    expect(rules(customDeck('RO1', 'left', [{ code: '2-201' }, { code: 'X-999' }]))).toEqual([
      '0 not-in-class',
      '1 not-exercise',
    ])
  })

  test('pace, static and side rules', () => {
    expect(rules(customDeck('RO1', 'left', [{ code: 'Z-017' }]))).toEqual(['0 same-pace'])
    expect(rules(customDeck('RO3', 'left', [{ code: 'Z-006' }, { code: '2-218' }]))).toContain(
      '1 after-static',
    )
    expect(rules(customDeck('RO-V', 'left', [{ code: 'Z-016' }, { code: 'Z-001' }]))).toEqual([
      '0 last-only',
    ])
    expect(rules(customDeck('FCI-ROB', 'right', [{ code: '417' }]))).toEqual(['0 side-only'])
    expect(rules(customDeck('FCI-ROB', 'left', [{ code: '116' }, { code: '201' }]))).toEqual([
      '1 pace-incompatible',
    ])
  })
})

describe('customDeckIssues with the guidelines', () => {
  test('every dealt national course replayed by hand passes', () => {
    for (const classId of ['RO-Z', 'RO1', 'RO2', 'RO3', 'RO-V'] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const dealt = dealDeck({
          classId,
          scope: 'all',
          count: 18,
          equipment: [...EQUIPMENT],
          startSide: seed % 2 ? 'left' : 'right',
          seed,
          competition: true,
        })
        const deck = customDeck(classId, dealt.options.startSide, dealt.entries)
        expect(customDeckIssues(deck, { guidelines: true })).toEqual([])
      }
    }
  })

  test('repeats, required exercises and side changes — not the course size', () => {
    const order = ['1-101', 'Z-006', '1-101'].map((code) => ({ code }))
    expect(rules(customDeck('RO1', 'left', order))).toEqual([])
    const issues = rules(customDeck('RO1', 'left', order), true)
    expect(issues).toContain('2 too-often')
    expect(issues).toContain('- required-missing')
    // No side change at all: RO1 needs one from a start "R" or to the finish.
    expect(issues).toContain('- right-pattern')
    expect(issues.some((i) => i.includes('course-size'))).toBe(false)
  })

  test('required exercises carry their label', () => {
    const [missing] = customDeckIssues(customDeck('RO-Z', 'left', [{ code: 'Z-018' }]), {
      guidelines: true,
    }).filter((i) => i.rule === 'required-missing')
    expect(missing).toMatchObject({ label: 'obejití psa', oneOf: ['Z-004', 'Z-005'] })
  })
})

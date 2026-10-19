import { describe, expect, test } from 'bun:test'
import {
  customDeck,
  customDeckIssues,
  getClass,
  type CardProblem,
  type DeckIssue,
  type RoClass,
} from '@rota/content'

import i18n from '../../i18n'
import { countedMessages, issueMessage } from '../course-issues'

const t = i18n.t.bind(i18n)
const ro1 = getClass('RO1') as RoClass
const ro2 = getClass('RO2') as RoClass

describe('issueMessage', () => {
  test('names the cards that would fix it, without breaking codes at the hyphen', () => {
    const [issue] = customDeckIssues(
      customDeck('RO2', 'left', [{ code: '2-211' }, { code: 'Z-001' }]),
    )
    expect(issue && issueMessage(issue, ro2, t)).toBe(
      'Po kartě 2‑211 musí následovat 2‑213, 2‑215, 2‑216 nebo 2‑214.',
    )
  })

  test('every rule has a Czech message', () => {
    const problems: CardProblem[] = [
      { rule: 'not-exercise' },
      { rule: 'not-in-class' },
      { rule: 'equipment' },
      { rule: 'twice-in-row' },
      { rule: 'not-follow-up', leave: '2-211', oneOf: ['2-213'] },
      { rule: 'follow-up-without-leave', leaveCards: ['2-211', '2-212'] },
      { rule: 'dealt-twice' },
      { rule: 'not-new' },
      { rule: 'after-static' },
      ...(['normal', 'slow', 'fast'] as const).flatMap((pace): CardProblem[] => [
        { rule: 'same-pace', pace },
        { rule: 'pace-incompatible', pace },
      ]),
      { rule: 'side-only', side: 'left' },
      { rule: 'side-only', side: 'right' },
      { rule: 'max-repeats', max: 2 },
      { rule: 'last-only' },
      { rule: 'leave-without-follow-up', oneOf: ['2-213'] },
      { rule: 'missing-supplementary' },
      { rule: 'supplementary-not-allowed', supplementary: 'D0b' },
      { rule: 'unexpected-supplementary' },
      { rule: 'side-mismatch', expected: 'left' },
      { rule: 'pace-mismatch', expected: 'slow' },
      { rule: 'supplementary-changes-side' },
      { rule: 'too-often', card: 'D0a', count: 3, limit: 2 },
      { rule: 'right-to-finish-early', within: 1 },
      { rule: 'right-to-finish-early', within: 2 },
      { rule: 'right-mid-course' },
      { rule: 'right-mid-too-long', max: 0 },
      { rule: 'right-mid-too-long', max: 1 },
    ]
    const courseIssues: DeckIssue[] = [
      { rule: 'required-missing', oneOf: ['2-217', '2-218'], label: 'skok' },
      { rule: 'required-missing', oneOf: ro2.cardCodes, label: 'další cvik' },
      { rule: 'static-share', statics: 2, count: 15 },
      { rule: 'right-start-late', by: 1 },
      { rule: 'right-pattern' },
      { rule: 'course-size', count: 3, min: 20, max: 22 },
      { rule: 'points-mix', points: 4, have: 2, min: 7 },
    ]
    const all = [
      ...problems.map((problem): DeckIssue => ({ index: 0, code: 'Z-001', ...problem })),
      ...courseIssues,
    ]
    for (const issue of all) {
      for (const cls of [ro2, ro1]) {
        const message = issueMessage(issue, cls, t)
        expect(message).not.toContain('issues.')
        expect(message).not.toContain('{{')
        expect(message).toEndWith('.')
      }
    }
  })

  test('guideline messages name what is missing and how often', () => {
    const tooOften: DeckIssue = {
      index: 2,
      code: '1-101',
      rule: 'too-often',
      card: '1-101',
      count: 2,
      limit: 1,
    }
    expect(issueMessage(tooOften, ro1, t)).toBe(
      '1‑101 je v parkuru 2×, směrnice dovolují nejvýš 1×.',
    )
    expect(
      issueMessage({ rule: 'required-missing', oneOf: ['2-217', '2-218'], label: 'skok' }, ro2, t),
    ).toBe('Chybí povinný cvik: skok – 2‑217 nebo 2‑218.')
    expect(
      issueMessage({ rule: 'right-pattern' }, ro1, t).startsWith(
        'Ve třídě RO1 směrnice dovolují jen jednu změnu strany',
      ),
    ).toBe(true)
  })

  test('identical messages are counted once', () => {
    expect(countedMessages(['A.', 'B.', 'A.', 'A.'])).toEqual(['A (3×).', 'B.'])
  })
})

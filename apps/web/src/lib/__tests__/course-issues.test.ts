import { describe, expect, test } from 'bun:test'
import {
  customDeck,
  customDeckIssues,
  getClass,
  type CardProblem,
  type RoClass,
} from '@rota/content'

import i18n from '../../i18n'
import { issueMessage } from '../course-issues'

const t = i18n.t.bind(i18n)
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
    ]
    for (const problem of problems) {
      const message = issueMessage({ index: 0, code: 'Z-001', ...problem }, ro2, t)
      expect(message).not.toContain('issues.')
      expect(message).not.toContain('{{')
      expect(message).toEndWith('.')
    }
  })
})

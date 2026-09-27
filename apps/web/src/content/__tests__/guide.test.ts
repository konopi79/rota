import { describe, expect, test } from 'bun:test'

import cs from '../../i18n/cs.json'
import { GUIDE } from '../guide'

describe('guide', () => {
  const text = GUIDE.flatMap((part) => part.steps).join('\n')

  test('ids are unique and every part has steps', () => {
    expect(new Set(GUIDE.map((p) => p.id)).size).toBe(GUIDE.length)
    for (const part of GUIDE) expect(part.steps.length).toBeGreaterThan(0)
  })

  // The guide quotes button and option labels; a renamed label must not leave it stale.
  test('quoted labels match the app', () => {
    for (const label of [cs.install.button, cs.setup.speak, cs.deck.next]) {
      expect(text).toContain(`„${label}“`)
    }
  })
})

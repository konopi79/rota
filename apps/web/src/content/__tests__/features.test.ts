import { describe, expect, test } from 'bun:test'

import { FEATURE_GROUPS, LATEST_FEATURE_ID } from '../features'

describe('feature list', () => {
  const items = FEATURE_GROUPS.flatMap((g) => g.items)

  test('ids are unique and the latest one exists', () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    expect(items.map((i) => i.id)).toContain(LATEST_FEATURE_ID)
  })

  test('every item has a title and a one- or two-sentence description', () => {
    for (const item of items) {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.desc.split(/[.!?](\s|$)/).filter((s) => s.trim()).length).toBeLessThanOrEqual(2)
    }
  })
})

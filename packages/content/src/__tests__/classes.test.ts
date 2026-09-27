import { describe, expect, test } from 'bun:test'

import { CLASS_IDS } from '../classes'

describe('CLASS_IDS', () => {
  test('lists every class exactly once', () => {
    expect(new Set(CLASS_IDS).size).toBe(CLASS_IDS.length)
    expect(CLASS_IDS).toEqual(['RO-Z', 'RO1', 'RO2', 'RO3', 'RO-V', 'FCI-ROB'])
  })
})

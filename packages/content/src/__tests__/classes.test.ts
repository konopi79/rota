import { describe, expect, test } from 'bun:test'

import { CLASS_IDS } from '../classes'

describe('CLASS_IDS', () => {
  test('lists every class exactly once', () => {
    expect(new Set(CLASS_IDS).size).toBe(CLASS_IDS.length)
    expect(CLASS_IDS).toEqual([
      'RO-Z',
      'RO1',
      'RO2',
      'RO3',
      'RO-V',
      'RO-Z-2027',
      'RO1-2027',
      'RO2-2027',
      'RO3-2027',
      'RO-V-2027',
      'FCI-ROB',
    ])
  })
})

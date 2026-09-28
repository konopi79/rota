import { describe, expect, test } from 'bun:test'

import { CANONICAL_URL, isOldHost } from '../install'

describe('moved to rotapp.cz', () => {
  test('only the original address shows the notice', () => {
    expect(isOldHost('rota.rock8cloud.app')).toBe(true)
    expect(isOldHost('rotapp.cz')).toBe(false)
    expect(isOldHost('www.rotapp.cz')).toBe(false)
    expect(isOldHost('localhost')).toBe(false)
  })

  test('the notice points at the canonical address', () => {
    expect(new URL(CANONICAL_URL).hostname).toBe('rotapp.cz')
  })
})

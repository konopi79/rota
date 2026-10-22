import { afterEach, describe, expect, test } from 'bun:test'

import { markStale, resetStale, staleLinkTarget } from '../stale-page'

const ORIGIN = 'https://rotapp.cz'
const click = (anchor: { href: string; target?: string; hasDownload?: boolean } | null) => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  anchor: anchor && { target: '', hasDownload: false, ...anchor },
})

afterEach(resetStale)

describe('stale page', () => {
  test('links work as usual until a new version takes over', () => {
    expect(staleLinkTarget(click({ href: `${ORIGIN}/trida/ro1` }), ORIGIN)).toBeUndefined()
  })

  test('then a link to this site loads the whole page', () => {
    markStale()
    expect(staleLinkTarget(click({ href: `${ORIGIN}/parkur?trida=FCI-ROB` }), ORIGIN)).toBe(
      `${ORIGIN}/parkur?trida=FCI-ROB`,
    )
  })

  test('other clicks are left alone', () => {
    markStale()
    expect(staleLinkTarget(click(null), ORIGIN)).toBeUndefined()
    expect(staleLinkTarget(click({ href: 'https://github.com/konopi79/rota' }), ORIGIN)).toBe(
      undefined,
    )
    expect(staleLinkTarget(click({ href: `${ORIGIN}/x`, target: '_blank' }), ORIGIN)).toBe(
      undefined,
    )
    expect(staleLinkTarget(click({ href: `${ORIGIN}/x`, hasDownload: true }), ORIGIN)).toBe(
      undefined,
    )
    expect(staleLinkTarget({ ...click({ href: `${ORIGIN}/x` }), metaKey: true }, ORIGIN)).toBe(
      undefined,
    )
    expect(staleLinkTarget({ ...click({ href: `${ORIGIN}/x` }), button: 1 }, ORIGIN)).toBe(
      undefined,
    )
    const handled = { ...click({ href: `${ORIGIN}/x` }), defaultPrevented: true }
    expect(staleLinkTarget(handled, ORIGIN)).toBeUndefined()
  })
})

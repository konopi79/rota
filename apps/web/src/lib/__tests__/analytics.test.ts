import { describe, expect, test } from 'bun:test'

import { analyticsPath, countUrl, GOATCOUNTER_ENDPOINT, shouldCount } from '../analytics'

describe('analytics', () => {
  test('decks and courses are counted by class, without seed or card position', () => {
    expect(analyticsPath('/balicek', '?trida=RO1&pocet=20&seed=123&karta=4')).toBe('/balicek/RO1')
    expect(analyticsPath('/parkur', '?trida=FCI-ROB&seed=5&parkur=1')).toBe('/parkur/FCI-ROB')
    expect(analyticsPath('/balicek', '')).toBe('/balicek')
  })

  test('other pages are counted by their path, query dropped', () => {
    expect(analyticsPath('/trida/ro2/kviz', '?x=1')).toBe('/trida/ro2/kviz')
    expect(analyticsPath('/', '')).toBe('/')
  })

  test('count URL carries path, event flag, referrer and screen width', () => {
    const url = new URL(
      countUrl({ path: '/balicek/RO1', referrer: 'https://facebook.com/', screenWidth: 390 }),
    )
    expect(`${url.origin}${url.pathname}`).toBe(GOATCOUNTER_ENDPOINT)
    expect(url.searchParams.get('p')).toBe('/balicek/RO1')
    expect(url.searchParams.get('r')).toBe('https://facebook.com/')
    expect(url.searchParams.get('s')).toBe('390')
    expect(url.searchParams.has('e')).toBe(false)
    expect(url.searchParams.get('rnd')).toBeTruthy()

    const event = new URL(countUrl({ path: 'spusteni-z-plochy', event: true }))
    expect(event.searchParams.get('e')).toBe('true')
    expect(event.searchParams.has('r')).toBe(false)
  })

  test('never counts development or local previews', () => {
    expect(shouldCount('rotapp.cz', true)).toBe(true)
    expect(shouldCount('rota.rock8cloud.app', true)).toBe(true)
    expect(shouldCount('rotapp.cz', false)).toBe(false)
    expect(shouldCount('localhost', true)).toBe(false)
    expect(shouldCount('127.0.0.1', true)).toBe(false)
  })
})

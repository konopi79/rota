import { describe, expect, test } from 'bun:test'

import { customDeck } from '@rota/content'

import { decodeDeckParams, deckOf, encodeDeckParams, type DeckParams } from '../deck-url'

const params: DeckParams = {
  options: {
    classId: 'RO2',
    scope: 'new',
    count: 12,
    equipment: ['cones', 'jump'],
    startSide: 'right',
    seed: 123456789,
  },
  showDescription: true,
  position: 4,
}

describe('deck URL', () => {
  test('round-trips every option', () => {
    const search = new URLSearchParams(encodeDeckParams(params))
    expect(decodeDeckParams(search)).toEqual(params)
  })

  test('is readable', () => {
    expect(encodeDeckParams(params)).toBe(
      'trida=RO2&karty=nove&pocet=12&pomucky=kuzely%2Cprekazka&strana=P&seed=123456789&popis=1&karta=4',
    )
  })

  test('fills defaults for optional keys', () => {
    const decoded = decodeDeckParams(new URLSearchParams('trida=RO1&pocet=20&seed=5'))
    expect(decoded).toEqual({
      options: {
        classId: 'RO1',
        scope: 'all',
        count: 20,
        equipment: [],
        startSide: 'left',
        seed: 5,
      },
      showDescription: false,
      position: 0,
    })
  })

  test('rejects URLs that do not describe a deck', () => {
    for (const bad of [
      '',
      'trida=RO9&pocet=20&seed=5',
      'trida=RO1&pocet=0&seed=5',
      'trida=RO1&pocet=20',
      'trida=RO1&pocet=20&seed=5&pomucky=lopata',
    ]) {
      expect(decodeDeckParams(new URLSearchParams(bad))).toBeNull()
    }
  })

  test('marks competition courses and keeps training decks without the flag', () => {
    const course = { ...params, options: { ...params.options, competition: true } }
    const encoded = encodeDeckParams(course)
    expect(encoded).toEndWith('&parkur=1')
    expect(decodeDeckParams(new URLSearchParams(encoded))).toEqual(course)
    expect(encodeDeckParams(params)).not.toContain('parkur')
  })
})

describe('hand-made course URL', () => {
  const order = [{ code: '2-211' }, { code: '2-214', supplementary: 'D0c' }, { code: 'Z-001' }]
  const custom: DeckParams = {
    options: customDeck('RO2', 'right', order).options,
    order,
    showDescription: false,
    speak: true,
    position: 2,
  }

  test('carries the cards instead of a seed, and round-trips', () => {
    const encoded = encodeDeckParams(custom)
    expect(encoded).toBe(
      'trida=RO2&poradi=2-211%2C2-214.D0c%2CZ-001&strana=P&popis=0&karta=2&hlas=1',
    )
    expect(decodeDeckParams(new URLSearchParams(encoded))).toEqual(custom)
    expect(deckOf(custom).entries.map((e) => e.code)).toEqual(['2-211', '2-214', 'Z-001'])
  })

  test('keeps an order that breaks the rules — the warnings say so, not the URL', () => {
    const decoded = decodeDeckParams(new URLSearchParams('trida=RO1&poradi=2-213,2-213'))
    expect(decoded?.order).toEqual([{ code: '2-213' }, { code: '2-213' }])
  })

  test('rejects unknown cards and malformed lists', () => {
    for (const bad of [
      'trida=RO1&poradi=',
      'trida=RO1&poradi=Z-999',
      'trida=RO1&poradi=D0a',
      'trida=RO1&poradi=Z-014.Z-001',
      'trida=RO1&poradi=Z-014.D0a.D0b',
      'trida=FCI-ROB&poradi=Z-001',
      `trida=RO1&poradi=${Array(101).fill('Z-001').join(',')}`,
    ]) {
      expect(decodeDeckParams(new URLSearchParams(bad))).toBeNull()
    }
  })
})

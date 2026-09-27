import { describe, expect, test } from 'bun:test'

import { decodeDeckParams, encodeDeckParams, type DeckParams } from '../deck-url'

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
})

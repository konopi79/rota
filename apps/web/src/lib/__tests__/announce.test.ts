import { describe, expect, test } from 'bun:test'
import { getCard, type Card, type DeckEntry } from '@rota/content'

import i18n from '../../i18n'
import { announcement } from '../announce'

const t = i18n.t.bind(i18n) as (key: string, values?: Record<string, string | number>) => string
const card = (code: string) => getCard('CZ', code) as Card
const entry = (code: string, extra: Partial<DeckEntry> = {}): DeckEntry => ({
  code,
  side: 'left',
  pace: 'normal',
  ...extra,
})

describe('announcement', () => {
  test('start and finish', () => {
    expect(announcement({ kind: 'start', startSide: 'left' }, t)).toBe('Start.')
    expect(announcement({ kind: 'start', startSide: 'right' }, t)).toBe('Start na pravou ruku.')
    expect(announcement({ kind: 'finish' }, t)).toBe('Cíl. Hotovo.')
  })

  test('number and name, with the D0 card', () => {
    expect(
      announcement(
        {
          kind: 'card',
          number: 3,
          entry: entry('Z-014', { supplementary: 'D0c' }),
          card: card('Z-014'),
          supplementary: card('D0c'),
        },
        t,
      ),
    ).toBe('Karta 3. Předsednutí. S doplňkovou kartou: Přiřazení okolo - vpřed.')
  })

  test('pace and side only when they change', () => {
    const previous = entry('Z-015')
    expect(
      announcement(
        {
          kind: 'card',
          number: 2,
          entry: entry('Z-006', { pace: 'slow' }),
          card: card('Z-006'),
          previous,
        },
        t,
      ),
    ).toBe('Karta 2. Obrat vpravo za chůze. Pomalé tempo.')
    expect(
      announcement(
        {
          kind: 'card',
          number: 3,
          entry: entry('Z-007', { pace: 'slow' }),
          card: card('Z-007'),
          previous: entry('Z-006', { pace: 'slow' }),
        },
        t,
      ),
    ).toBe('Karta 3. Obrat vlevo za chůze.')
    expect(
      announcement(
        {
          kind: 'card',
          number: 5,
          entry: entry('Z-006', { side: 'right' }),
          card: card('Z-006'),
          previous: entry('1-125'),
        },
        t,
      ),
    ).toBe('Karta 5. Obrat vpravo za chůze. Pes vpravo.')
  })
})

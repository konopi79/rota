import { describe, expect, test } from 'bun:test'
import {
  customDeck,
  getCard,
  getClass,
  type Card,
  type DeckEntry,
  type RoClass,
} from '@rota/content'

import i18n from '../../i18n'
import { announcement, deckScreen, walkthroughAnnouncement } from '../announce'

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
    expect(announcement({ kind: 'finish', side: 'left' }, t)).toBe('Cíl. Hotovo.')
    expect(announcement({ kind: 'finish', side: 'right' }, t)).toBe(
      'Do cíle se psem vpravo. Hotovo.',
    )
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
    ).toBe('Karta 3, Předsednutí. S doplňkovou kartou: Přiřazení okolo - vpřed.')
  })

  test('the cards done at the same station after it (CNDC)', () => {
    expect(
      announcement(
        {
          kind: 'card',
          number: 4,
          entry: entry('1-124'),
          card: card('1-124'),
          following: [{ number: 5, card: card('3-305') }],
        },
        t,
      ),
    ).toBe(
      'Karta 4, Stop – změna za psovodem – stop. Na stejném stanovišti karta 5, Stop – lehni – vstaň.',
    )
  })

  test('after a dynamic exercise, a step forward first', () => {
    expect(
      announcement(
        {
          kind: 'card',
          number: 17,
          entry: entry('3-326'),
          card: card('3-326'),
          following: [{ number: 18, card: card('1-103'), stepFirst: true }],
        },
        t,
      ),
    ).toBe(
      'Karta 17, Výměna při obratu o 180° vlevo. Na stejném stanovišti po kroku vpřed karta 18, Stop – obrat vpravo o 90° – vpřed.',
    )
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
    ).toBe('Karta 2, Obrat vpravo za chůze. Pomalé tempo.')
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
    ).toBe('Karta 3, Obrat vlevo za chůze.')
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
    ).toBe('Karta 5, Obrat vpravo za chůze. Pes vpravo.')
  })
})

describe('deckScreen and walkthroughAnnouncement', () => {
  const cls = getClass('RO1') as RoClass
  // 1-124 + 1-105 at one station (CNDC), then Z-014 with D0a.
  const deck = customDeck('RO1', 'right', [
    { code: 'Z-006' },
    { code: '1-124' },
    { code: '1-105', withPrevious: true },
    { code: 'Z-014', supplementary: 'D0a' },
  ])

  test('screens of a deck: start, cards with their station, finish', () => {
    expect(deckScreen(deck, cls, 0)).toEqual({ kind: 'start', startSide: 'right' })
    const station = deckScreen(deck, cls, 2)
    expect(station.kind === 'card' && station.following?.map((f) => f.number)).toEqual([3])
    expect(deckScreen(deck, cls, 5)).toEqual({ kind: 'finish', side: 'left' })
  })

  test('the first card of a run from the start, then "další karta"', () => {
    expect(walkthroughAnnouncement(deck, cls, 0, true, t)).toBe(
      `Start na pravou ruku. Karta 1, ${card('Z-006').name}.`,
    )
    expect(walkthroughAnnouncement(deck, cls, 3, false, t)).toBe(
      `Další karta 4, ${card('Z-014').name}. S doplňkovou kartou: ${card('D0a').name}.`,
    )
  })

  test('a run from another card starts with that card; a station is read whole', () => {
    expect(walkthroughAnnouncement(deck, cls, 1, true, t)).toMatch(
      new RegExp(`^Karta 2, .*Na stejném stanovišti .*karta 3, `),
    )
    expect(walkthroughAnnouncement(deck, cls, 1, false, t)).toMatch(/^Další karta 2, /)
  })
})

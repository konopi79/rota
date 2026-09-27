import { describe, expect, test } from 'bun:test'
import { getCard, getClass, type Card, type RoClass } from '@rota/content'

import {
  catalogueCards,
  classesWith,
  filterCards,
  fold,
  NO_FILTERS,
  sequencingNotes,
} from '../catalogue'

const cls = (id: Parameters<typeof getClass>[0]) => getClass(id) as RoClass
const card = (ruleset: 'CZ' | 'FCI', code: string) => getCard(ruleset, code) as Card
const codes = (cards: Card[]) => cards.map((c) => c.code)

describe('catalogue', () => {
  test('a national class lists its exercises and D0 cards; FCI only its exercises', () => {
    expect(catalogueCards(cls('RO-Z'))).toHaveLength(32 + 4)
    expect(catalogueCards(cls('RO-V')).map((c) => c.code)).toContain('D0c')
    expect(catalogueCards(cls('RO-V')).map((c) => c.code)).not.toContain('D0b')
    expect(catalogueCards(cls('FCI-ROB'))).toHaveLength(89)
  })

  test('search ignores case and diacritics and matches code, name and English name', () => {
    expect(fold('Předsednutí')).toBe('predsednuti')
    const ro1 = cls('RO1')
    const all = catalogueCards(ro1)
    expect(codes(filterCards(ro1, all, { ...NO_FILTERS, query: 'PREDSEDNUTI' }))).toContain('Z-014')
    expect(codes(filterCards(ro1, all, { ...NO_FILTERS, query: '1-110' }))).toEqual(['1-110'])
    const fci = cls('FCI-ROB')
    expect(
      codes(filterCards(fci, catalogueCards(fci), { ...NO_FILTERS, query: 'loop right' })),
    ).toEqual(['107'])
  })

  test('filters: new cards, type/points group, equipment at hand', () => {
    const ro2 = cls('RO2')
    const all = catalogueCards(ro2)
    expect(filterCards(ro2, all, { ...NO_FILTERS, newOnly: true })).toHaveLength(32)
    expect(
      filterCards(ro2, all, { ...NO_FILTERS, group: 'AB' }).every((c) => c.exerciseType === 'AB'),
    ).toBe(true)
    const noGear = filterCards(ro2, all, { ...NO_FILTERS, equipment: [] })
    expect(noGear.some((c) => c.sequencing.equipment)).toBe(false)
    const fci = cls('FCI-ROB')
    expect(filterCards(fci, catalogueCards(fci), { ...NO_FILTERS, group: '3' })).toHaveLength(23)
  })

  test('the classes a card belongs to', () => {
    expect(classesWith(card('CZ', 'Z-001')).map((c) => c.id)).toEqual([
      'RO-Z',
      'RO1',
      'RO2',
      'RO3',
      'RO-V',
    ])
    expect(classesWith(card('CZ', '3-301')).map((c) => c.id)).toEqual(['RO3'])
    expect(classesWith(card('FCI', '101')).map((c) => c.id)).toEqual(['FCI-ROB'])
  })

  test('sequencing rules in words', () => {
    expect(sequencingNotes(card('CZ', 'Z-001'))).toEqual([])
    expect(sequencingNotes(card('CZ', '2-211')).map((n) => n.key)).toEqual(['notes.nextOneOf'])
    expect(sequencingNotes(card('CZ', 'Z-016')).map((n) => n.key)).toEqual([
      'notes.pace.fast',
      'notes.lastOnly',
    ])
    expect(sequencingNotes(card('FCI', '417')).map((n) => n.key)).toEqual([
      'notes.sideOnly.left',
      'notes.endSide.right',
    ])
  })
})

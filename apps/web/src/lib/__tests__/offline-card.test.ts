import { RULESET_CARDS } from '@rota/content'
import { describe, expect, test } from 'bun:test'

import { cardHref } from '../classes'
import { cardFromPath } from '../offline-card'
import { inPrecache, isCardPage, OFFLINE_CARD_PATH } from '../offline-card-path'

describe('offline card page (R20)', () => {
  test('every card is found from its own address', () => {
    for (const card of Object.values(RULESET_CARDS).flat()) {
      expect(cardFromPath(cardHref(card))).toBe(card)
    }
  })

  test('an address served as a file or with a slash finds the card too', () => {
    expect(cardFromPath('/karta/cz/z-014.html')?.code).toBe('Z-014')
    expect(cardFromPath('/karta/cz/z-014/')?.code).toBe('Z-014')
    expect(cardFromPath('/karta/cz-2027/z-014')?.ruleset).toBe('CZ-2027')
  })

  test('nothing for unknown cards, rulesets or other pages', () => {
    expect(cardFromPath('/karta/cz/z-999')).toBeUndefined()
    expect(cardFromPath('/karta/xx/z-014')).toBeUndefined()
    expect(cardFromPath(OFFLINE_CARD_PATH)).toBeUndefined()
    expect(cardFromPath('/trida/ro1')).toBeUndefined()
  })

  test("the cards' own pages stay out of the precache, the offline page in", () => {
    for (const file of [
      'karta/cz/z-014.html',
      'karta/cz/z-014.txt',
      'karta/cz/z-014/__next._full.txt',
      'karta/fci/101.html',
    ]) {
      expect(isCardPage(file)).toBe(true)
      expect(inPrecache(file)).toBe(false)
    }
    for (const file of [
      'karta/_/_.html',
      'karta/_/_.txt',
      'karta/_/_/__next._tree.txt',
      'cards/cz/z-014.webp',
      'trida/ro1.html',
      'index.html',
    ]) {
      expect(inPrecache(file)).toBe(true)
    }
    expect(isCardPage('/karta/cz/z-014')).toBe(true)
    expect(isCardPage(OFFLINE_CARD_PATH)).toBe(false)
  })
})

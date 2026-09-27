import type { RoClass } from '../schema'
import { RO1_CARDS } from './ro1'
import { RO2_CARDS } from './ro2'
import { RO3_CARDS } from './ro3'
import { RO_Z_CARDS } from './ro-z'

const codes = (cards: { code: string }[]) => cards.map((c) => c.code)
const D0_ALL = ['D0a', 'D0b', 'D0c', 'D0d']

/**
 * National classes — Zkušební řád Rally Obedience v ČR 2026, §5.4. RO-Z…RO3 are
 * cumulative: "Rozhodčí může vybírat cviky určené pro kategorii RO-Z a RO1 (karty číslo
 * 001–125)" etc.
 */
export const CZ_CLASSES: RoClass[] = [
  {
    id: 'RO-Z',
    ruleset: 'CZ',
    name: 'RO-Z – začátečníci',
    course: { minCards: 15, maxCards: 18, leash: 'allowed', supplementary: D0_ALL },
    cardCodes: codes(RO_Z_CARDS),
    newCardCodes: codes(RO_Z_CARDS),
    sourcePage: 11,
  },
  {
    id: 'RO1',
    ruleset: 'CZ',
    name: 'RO1',
    course: { minCards: 18, maxCards: 20, leash: 'allowed', supplementary: D0_ALL },
    cardCodes: codes([...RO_Z_CARDS, ...RO1_CARDS]),
    newCardCodes: codes(RO1_CARDS),
    sourcePage: 11,
  },
  {
    id: 'RO2',
    ruleset: 'CZ',
    name: 'RO2',
    course: { minCards: 20, maxCards: 22, leash: 'off-leash', supplementary: D0_ALL },
    cardCodes: codes([...RO_Z_CARDS, ...RO1_CARDS, ...RO2_CARDS]),
    newCardCodes: codes(RO2_CARDS),
    sourcePage: 11,
  },
  {
    id: 'RO3',
    ruleset: 'CZ',
    name: 'RO3',
    course: { minCards: 22, maxCards: 24, leash: 'off-leash', supplementary: D0_ALL },
    cardCodes: codes([...RO_Z_CARDS, ...RO1_CARDS, ...RO2_CARDS, ...RO3_CARDS]),
    newCardCodes: codes(RO3_CARDS),
    sourcePage: 12,
  },
  {
    // §5.4.5 + příloha 1 §8.1.2 "RO-V: přehled karet" (p. 62). Z-016 and 1-110 are
    // "pouze jako poslední karta" — see their `sequencing.lastOnly`.
    id: 'RO-V',
    ruleset: 'CZ',
    name: 'RO-V – veteráni',
    course: { minCards: 12, maxCards: 12, leash: 'allowed', supplementary: ['D0a', 'D0c'] },
    cardCodes: [
      ...[1, 2, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
        .concat([28, 30, 31, 32])
        .map((n) => `Z-${String(n).padStart(3, '0')}`),
      ...[102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 116, 117, 118, 119, 120].map(
        (n) => `1-${n}`,
      ),
      ...[208, 215, 220, 221, 223, 225, 227, 230, 231].map((n) => `2-${n}`),
      ...[303, 307, 318].map((n) => `3-${n}`),
    ],
    newCardCodes: [],
    sourcePage: 62,
  },
]

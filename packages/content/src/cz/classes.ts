import type { RoClass } from '../schema'
import { RO1_CARDS } from './ro1'
import { RO2_CARDS } from './ro2'
import { RO3_CARDS } from './ro3'
import { RO_Z_CARDS } from './ro-z'

const codes = (cards: { code: string }[]) => cards.map((c) => c.code)
const D0_ALL = ['D0a', 'D0b', 'D0c', 'D0d']

/**
 * When a competition course leads the dog on the right — Směrnice pro posuzování 2025
 * (Klub Obedience CZ), not the regulation. RO-Z and RO-V have no side-change cards and
 * the guidelines say nothing about their sides.
 */
// §1.2.3 (p. 6): one of 1-123–1-125, "povolena pouze JEDNA změna strany" — from a start
// "R" to the first card, or from the last card to the finish.
const RO1_RIGHT_HAND = { startBy: 1, endWithin: 1 }
// §1.2.4 (p. 6–7): the same, "plus jedna další změna … a následující cvik opět vrátí psa
// od pravé k levé noze", or a start "R" and the last card to the finish.
const RO2_RIGHT_HAND = { startBy: 1, endWithin: 1, midLength: 0 }
// §1.2.5 (p. 7): start "R" "maximálně ke druhému cviku", the change to the finish
// "maximálně na předposledním cviku", mid-course "maximálně jeden další cvik u pravé nohy".
const RO3_RIGHT_HAND = { startBy: 2, endWithin: 2, midLength: 1 }

/** A card number as the guidelines write it (018, 101, 213) → its code. */
const card = (n: number) =>
  n < 100 ? `Z-${String(n).padStart(3, '0')}` : `${Math.floor(n / 100)}-${n}`
const cards = (...ns: number[]) => ns.map(card)

// §1.2.1 (p. 5): every card once, except the D0 cards ("dvakrát") and ten cards
// ("třikrát"); Z-014 four times in RO-Z. The "třikrát" list repeats D0a–d — a leftover:
// the regulation's minimum card set (§5.4, p. 11) has 2 of each D0 and 3 of the ten.
const REPEATS: Record<string, number> = {
  ...Object.fromEntries(D0_ALL.map((d) => [d, 2])),
  ...Object.fromEntries(cards(1, 6, 7, 8, 9, 11, 12, 17, 28, 29).map((c) => [c, 3])),
}

// §1.2.2–1.2.6 (p. 6–8): "V parkuru … musí být zvoleny nejméně následující cviky".
// §1.2.2 RO-Z: a figure, Z-004/Z-005, a předsednutí with its D0 card.
const RO_Z_REQUIRED = [
  { oneOf: cards(18, 19, 20, 21, 22, 26, 27) },
  { oneOf: cards(4, 5) },
  { oneOf: cards(14, 25, 32) },
]
// §1.2.3 RO1: a turn to the left, one of 103–106/119/120, a side change, "nejméně 3 další
// libovolné cviky z karet 101 až 125".
const RO1_REQUIRED = [
  { oneOf: cards(9, 12, 101, 113) },
  { oneOf: cards(103, 104, 105, 106, 119, 120) },
  { oneOf: cards(123, 124, 125) },
  { oneOf: codes(RO1_CARDS), count: 3 },
]
// §1.2.4 RO2: a recall, a jump, a turn, a stand, "nejméně dva další libovolné cviky
// z karet 201 až 227".
const RO2_REQUIRED = [
  { oneOf: cards(213, 214, 215, 216) },
  { oneOf: cards(217, 218) },
  { oneOf: cards(203, 204, 205, 206, 225, 226) },
  { oneOf: cards(107, 108, 118, 119, 120, 209, 210, 221, 223, 224, 225, 226, 227) },
  {
    oneOf: codes(RO2_CARDS).filter((c) => !cards(228, 229, 230, 231, 232).includes(c)),
    count: 2,
  },
]
// §1.2.5 RO3: a recall, "2x skok … z toho musí být nejméně 1 přeskok ze třídy 3", one of
// 310–312, a stand, "nejméně tři další libovolné cviky z karet 301 až 327".
const RO3_REQUIRED = [
  { oneOf: cards(302, 308, 309, 319, 320, 321, 322) },
  { oneOf: cards(313, 314) },
  { oneOf: cards(217, 218, 313, 314) },
  { oneOf: cards(310, 311, 312) },
  { oneOf: cards(303, 304, 305, 306, 307, 316, 317, 318) },
  { oneOf: codes(RO3_CARDS), count: 3 },
]
// §1.2.6 RO-V (p. 7–8): a food refusal, one of 004/005/303/307, a stand, a předsednutí or
// a stand in front of the handler (1-114/1-115 are not RO-V cards; ignored).
const RO_V_REQUIRED = [
  { oneOf: cards(111, 117, 220) },
  { oneOf: cards(4, 5, 303, 307) },
  { oneOf: cards(107, 118, 119, 120, 221, 223, 225, 227, 303, 318) },
  { oneOf: cards(14, 25, 32, 108, 221) },
]

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
    course: {
      minCards: 15,
      maxCards: 18,
      leash: 'allowed',
      supplementary: D0_ALL,
      repeats: { ...REPEATS, [card(14)]: 4 },
      required: RO_Z_REQUIRED,
      // §1.1.1 (p. 2): "ve třídě RO-Z by měly být cviky A a B zastoupeny v poměru 50/50".
      staticShare: { tolerance: 1 },
    },
    cardCodes: codes(RO_Z_CARDS),
    newCardCodes: codes(RO_Z_CARDS),
    sourcePage: 11,
  },
  {
    id: 'RO1',
    ruleset: 'CZ',
    name: 'RO1',
    course: {
      minCards: 18,
      maxCards: 20,
      leash: 'allowed',
      supplementary: D0_ALL,
      repeats: REPEATS,
      required: RO1_REQUIRED,
      rightHand: RO1_RIGHT_HAND,
    },
    cardCodes: codes([...RO_Z_CARDS, ...RO1_CARDS]),
    newCardCodes: codes(RO1_CARDS),
    sourcePage: 11,
  },
  {
    id: 'RO2',
    ruleset: 'CZ',
    name: 'RO2',
    course: {
      minCards: 20,
      maxCards: 22,
      leash: 'off-leash',
      supplementary: D0_ALL,
      repeats: REPEATS,
      required: RO2_REQUIRED,
      rightHand: RO2_RIGHT_HAND,
    },
    cardCodes: codes([...RO_Z_CARDS, ...RO1_CARDS, ...RO2_CARDS]),
    newCardCodes: codes(RO2_CARDS),
    sourcePage: 11,
  },
  {
    id: 'RO3',
    ruleset: 'CZ',
    name: 'RO3',
    course: {
      minCards: 22,
      maxCards: 24,
      leash: 'off-leash',
      supplementary: D0_ALL,
      repeats: REPEATS,
      required: RO3_REQUIRED,
      rightHand: RO3_RIGHT_HAND,
    },
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
    course: {
      minCards: 12,
      maxCards: 12,
      leash: 'allowed',
      supplementary: ['D0a', 'D0c'],
      repeats: REPEATS,
      required: RO_V_REQUIRED,
    },
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

import type { Card } from '../schema'

/**
 * Start, finish and the supplementary cards D0a–d. Proofread from Zkušební řád Rally
 * Obedience v ČR 2026, příloha 1 (`sourcePage` = page of the regulation).
 */
export const START_FINISH_CARDS: Card[] = [
  {
    code: 'START',
    ruleset: 'CZ',
    kind: 'start',
    name: 'Start',
    description: [
      'Tým nemusí zaujmout žádnou základní pozici a může hned po přípravě startovat. Posuzování začíná po překročení startovní linie normálním tempem.',
      'Pokud parkur začíná rovnou na pravou ruku, je karta start doplněna značkou / označením „R“.',
    ],
    sequencing: {},
    image: 'start',
    sourcePage: 17,
  },
  {
    code: 'FINISH',
    ruleset: 'CZ',
    kind: 'finish',
    name: 'Cíl',
    description: [
      'Posuzování končí po překročení cílové linie. Pak může psovod psa vydatně pochválit a odměnit (pohlazení, hra, pamlsky či hračka).',
    ],
    sequencing: {},
    image: 'finish',
    sourcePage: 17,
  },
]

/**
 * Dealt only together with an exercise that `requiresSupplementary` — never on their own.
 * D0a/D0b end static (type A), D0c/D0d in motion (type B).
 */
export const SUPPLEMENTARY_CARDS: Card[] = [
  {
    code: 'D0a',
    ruleset: 'CZ',
    kind: 'supplementary',
    exerciseType: 'A',
    name: 'Přiřazení okolo - stop',
    description: [
      'Pes z pozice před psovodem jej oběhne z pravé strany a přiřadí se do základní pozice u levé nohy. Během pohybu psa psovod nesmí hýbat nohama. Hodnocení je zahrnuto do bodového hodnocení cviku na hlavní kartě.',
    ],
    subParts: [{ text: 'přiřazení okolo - stop', main: false }],
    sequencing: {},
    image: 'd0a',
    sourcePage: 17,
  },
  {
    code: 'D0b',
    ruleset: 'CZ',
    kind: 'supplementary',
    exerciseType: 'A',
    name: 'Přiřazení přímo - stop',
    description: [
      'Pes z pozice před psovodem se přiřazuje přímo k levé noze psovoda a zaujímá základní pozici. Během pohybu psa psovod nesmí hýbat nohama. Hodnocení je zahrnuto do bodového hodnocení hlavního cviku.',
    ],
    subParts: [{ text: 'přiřazení přímo - stop', main: false }],
    sequencing: {},
    image: 'd0b',
    sourcePage: 17,
  },
  {
    code: 'D0c',
    ruleset: 'CZ',
    kind: 'supplementary',
    exerciseType: 'B',
    name: 'Přiřazení okolo - vpřed',
    description: [
      'Pes z pozice před psovodem jej oběhne z pravé strany a při dosažení úrovně jeho levé nohy (pes si nesedá) společně pokračují v přímém směru. Během obíhání psem nesmí psovod hýbat nohama.',
      'Hodnocení je zahrnuto do bodového hodnocení cviku na hlavní kartě.',
    ],
    subParts: [{ text: 'přiřazení okolo - vpřed', main: false }],
    sequencing: {},
    image: 'd0c',
    sourcePage: 18,
  },
  {
    code: 'D0d',
    ruleset: 'CZ',
    kind: 'supplementary',
    exerciseType: 'B',
    name: 'Přiřazení přímo - vpřed',
    description: [
      'Pes z pozice před psovodem se přiřazuje přímo k levé noze (neobchází) a při dosažení úrovně jeho levé nohy (pes si nesedá) společně pokračují v přímém směru. Během přiřazování psa psovod nesmí hýbat nohama.',
      'Hodnocení je zahrnuto do bodového hodnocení cviku na hlavní kartě.',
    ],
    subParts: [{ text: 'přiřazení přímo - vpřed', main: false }],
    sequencing: {},
    image: 'd0d',
    sourcePage: 18,
  },
]

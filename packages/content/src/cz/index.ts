import type { Card } from '../schema'
import { RO1_CARDS } from './ro1'
import { RO2_CARDS } from './ro2'
import { RO3_CARDS } from './ro3'
import { RO_Z_CARDS } from './ro-z'
import { START_FINISH_CARDS, SUPPLEMENTARY_CARDS } from './supplementary'

export { CZ_CLASSES } from './classes'

/** Every national card: start, finish, D0a–d and the exercises of all classes. */
export const CZ_CARDS: Card[] = [
  ...START_FINISH_CARDS,
  ...SUPPLEMENTARY_CARDS,
  ...RO_Z_CARDS,
  ...RO1_CARDS,
  ...RO2_CARDS,
  ...RO3_CARDS,
]

export const CZ_RULESET = {
  id: 'CZ',
  name: 'Zkušební řád Rally Obedience v ČR',
  validFrom: '2026-04-01', // "nabývá účinnosti dne 01.04.2026"
  source: 'Zkušební řád Rally Obedience v ČR, 2026 — příloha 1: Popis cviků',
} as const

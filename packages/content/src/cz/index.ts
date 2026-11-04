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

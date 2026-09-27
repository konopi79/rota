import type { Card, RoClass } from '../schema'
import { FCI_ONE_POINT_CARDS } from './points-1'
import { FCI_TWO_POINT_CARDS } from './points-2'
import { FCI_THREE_POINT_CARDS } from './points-3'
import { FCI_FOUR_POINT_CARDS } from './points-4'

const START_FINISH: Card[] = [
  {
    code: 'START',
    ruleset: 'FCI',
    kind: 'start',
    placement: 'A',
    name: 'Start',
    nameEn: 'START',
    description: [
      'Pes sedí po levé nebo pravé straně psovoda podle instrukcí na plánu parkuru. Jakmile je tým připraven, vychází vpřed.',
    ],
    sequencing: {},
    image: 'start',
    sourcePage: 19,
  },
  {
    code: 'FINISH',
    ruleset: 'FCI',
    kind: 'finish',
    placement: 'A',
    name: 'Cíl',
    nameEn: 'FINISH',
    description: [
      'Parkur je dokončen, jakmile tým mine tuto kartu. Tým opouští soutěžní prostor v normálním tempu.',
    ],
    sequencing: {},
    image: 'finish',
    sourcePage: 19,
  },
]

const EXERCISES = [
  ...FCI_ONE_POINT_CARDS,
  ...FCI_TWO_POINT_CARDS,
  ...FCI_THREE_POINT_CARDS,
  ...FCI_FOUR_POINT_CARDS,
]

/** Every FCI card: start, finish and the 89 exercises. */
export const FCI_CARDS: Card[] = [...START_FINISH, ...EXERCISES]

/**
 * The one international class — §3.5: 18–20 cards plus start and finish, "Jednu kartu
 * lze v jednom parkuru použít maximálně dvakrát"; §1.5.3: off leash. The point mix
 * (≥ 7 four-point, ≥ 5 three-point cards) is a competition-course rule for R7, not for
 * training decks.
 */
export const FCI_CLASSES: RoClass[] = [
  {
    id: 'FCI-ROB',
    ruleset: 'FCI',
    name: 'FCI-ROB',
    course: {
      minCards: 18,
      maxCards: 20,
      leash: 'off-leash',
      supplementary: [],
      paceCompatibleOnly: true,
      maxRepeats: 2,
    },
    cardCodes: EXERCISES.map((c) => c.code),
    newCardCodes: [],
    sourcePage: 12,
  },
]

export const FCI_RULESET = {
  id: 'FCI',
  name: 'FCI Rally Obedience',
  validFrom: '2025-02-01', // "Účinnost od 01. 02. 2025"
  source: 'Zkušební řád & Směrnice pro Mezinárodní soutěže FCI Rally Obedience (CZ překlad)',
} as const

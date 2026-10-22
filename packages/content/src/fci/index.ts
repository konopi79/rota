import type { Card, RoClass } from '../schema'
import { FCI_ONE_POINT_CARDS } from './points-1'
import { FCI_TWO_POINT_CARDS } from './points-2'
import { FCI_THREE_POINT_CARDS } from './points-3'
import { FCI_FOUR_POINT_CARDS } from './points-4'
import { FCI_DEAL_WEIGHTS, FCI_JUDGES_USAGE } from './usage'

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
 * (≥ 7 four-point, ≥ 5 three-point cards) applies to competition courses only (R7).
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
      // §3.5: "Parkur musí obsahovat alespoň 7 čtyřbodových a alespoň 5 tříbodových karet."
      minByPoints: { '4': 7, '3': 5 },
      // Not a rule: how often judges set each card, so a dealt course reads like theirs.
      judgesUsage: FCI_JUDGES_USAGE,
      dealWeights: FCI_DEAL_WEIGHTS,
      // §3.3: "Velikost soutěžního prostoru ... by měla být minimálně 20 m x 20 m". Judges
      // often have more: two of four course plans we had were 30 × 20 m, and so is the
      // default of the FCI Rally Obedience HUB's course planner. Upright, for a phone.
      fields: [
        { width: 20, height: 20 },
        { width: 20, height: 30 },
      ],
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

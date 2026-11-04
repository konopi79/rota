/**
 * The Czech national regulation from April 2027 (plan R21, R22). The Czech club takes over the
 * German VDH Regelwerk Rally Obedience 2027 (`podklady/2027/`); its Czech text is not out yet.
 * Built from the 2026 cards: what VDH 2027 changes (`ro-z.ts` … `ro3.ts`, each change citing its
 * VDH page), its new cards and the two codes that mean another exercise now (1-116, 3-302); the
 * German text rules where the Czech 2026 one differed (the author, 2026-11-04). The texts of new
 * and changed cards are our translation until the Czech regulation.
 */
import type { ClassId } from '../classes'
import { CZ_CARDS, CZ_CLASSES } from '../cz'
import { RO1_CARDS } from '../cz/ro1'
import { RO2_CARDS } from '../cz/ro2'
import { RO3_CARDS } from '../cz/ro3'
import { RO_Z_CARDS } from '../cz/ro-z'
import type { Card, RoClass } from '../schema'
import { RO1_2027 } from './ro1'
import { RO2_2027 } from './ro2'
import { RO3_2027 } from './ro3'
import { RO_Z_2027 } from './ro-z'

const CONTENT = [RO_Z_2027, RO1_2027, RO2_2027, RO3_2027]
const CHANGES = Object.assign({}, ...CONTENT.map((c) => c.changes)) as (typeof RO_Z_2027)['changes']
const PAGES = Object.assign({}, ...CONTENT.map((c) => c.pages)) as Record<string, number>
const WRITTEN = new Map(CONTENT.flatMap((c) => c.cards).map((card) => [card.code, card]))

/**
 * The 2027 card of a 2026 one: rewritten whole where the code means another exercise now,
 * otherwise the 2026 card with what 2027 changes on it — its image the 2026 one (`imageSet`)
 * until the 2027 images (R23). No sub-parts: "Zrušeny hlavní a vedlejší části cviků" (the
 * club's slides; VDH 2027 has none). No last-card rule: VDH 2027 has none (Senioren §5.5).
 */
function in2027(card: Card): Card {
  const written = WRITTEN.get(card.code)
  if (written) return written
  const { subParts: _subParts, ...rest } = card
  const changed = { ...rest, ...CHANGES[card.code] }
  const { lastOnly: _lastOnly, ...sequencing } = changed.sequencing
  return {
    ...changed,
    sequencing,
    ruleset: 'CZ-2027',
    imageSet: 'CZ',
    sourcePage: PAGES[card.code] ?? card.sourcePage,
  }
}

const CODES_2026 = new Set(CZ_CARDS.map((c) => c.code))
/** Cards with no 2026 card of their code: B-033–036, 1-126–130, 2-233/234, 3-328–332, D0e. */
const NEW = [...WRITTEN.values()].filter((c) => !CODES_2026.has(c.code))

const byCode = (a: Card, b: Card) => a.code.localeCompare(b.code)
/** A class's 2027 exercise cards: its 2026 ones, as 2027 has them, and its new ones. */
const classCards = (cards2026: Card[], prefix: string) =>
  [...cards2026.map(in2027), ...NEW.filter((c) => c.code.startsWith(prefix))].sort(byCode)

const RO_Z = classCards(RO_Z_CARDS, 'Z-')
const RO1 = classCards(RO1_CARDS, '1-')
const RO2 = classCards(RO2_CARDS, '2-')
const RO3 = classCards(RO3_CARDS, '3-')
const START_AND_D0 = [
  ...CZ_CARDS.filter(
    (c) => c.kind === 'start' || c.kind === 'finish' || c.kind === 'supplementary',
  ),
  ...NEW.filter((c) => c.kind === 'supplementary'),
].map(in2027)

/** Every 2027 card: start, finish, D0a–e and the exercises of all classes. */
export const CZ_2027_CARDS: Card[] = [...START_AND_D0, ...RO_Z, ...RO1, ...RO2, ...RO3]

/**
 * The 2027 cards that are not the 2026 exercise as it was — new, rewritten or changed (also
 * where only the footwork changed). Their 2026 animation would show the old exercise, so
 * until R22b they have none (the author, 2026-11-04).
 */
export const CZ_2027_REVISED: ReadonlySet<string> = new Set([
  ...WRITTEN.keys(),
  ...Object.keys(CHANGES),
])

const codes = (cards: Card[]) => cards.map((c) => c.code)
const D0_ALL = ['D0a', 'D0b', 'D0c', 'D0d', 'D0e']

/** The 2026 classes' fields, maximum of jumps and CNDC shape, kept for 2027. */
const course2026 = (id: ClassId) => CZ_CLASSES.find((c) => c.id === id)!.course

/**
 * "Každá karta smí být použita max 2x" (the club's slides, "VYBAVENÍ"; VDH §4.1 only asks for
 * every card "mindestens 2-mal"): on a competition course each card, D0 cards included, at most
 * twice.
 */
const MAX_REPEATS = 2

/**
 * The 2027 classes — VDH Regelwerk 2027, §5.1–5.5 (S. 12–13). RO-Z…RO3 cumulative ("Der RO-R
 * darf hier aus den Übungen RO B und RO 1 wählen", …). Competition courses follow the
 * regulation and the club's slides only: the guidelines' (Směrnice 2025) required exercises,
 * repeat list and RO-Z balance are not kept until new guidelines (the author, 2026-11-04).
 */
export const CZ_2027_CLASSES: RoClass[] = [
  {
    // §5.1: "15 bis 18 Übungsschildern zuzüglich der Start-, Ziel- und Zusatzschilder a-e …
    // mit oder ohne Leine … Es wird keine MSÜ gestellt."
    id: 'RO-Z-2027',
    ruleset: 'CZ-2027',
    name: 'RO-Z – začátečníci',
    course: {
      minCards: 15,
      maxCards: 18,
      leash: 'allowed',
      supplementary: D0_ALL,
      fields: course2026('RO-Z').fields,
      maxJumps: course2026('RO-Z').maxJumps,
      maxRepeats: MAX_REPEATS,
    },
    cardCodes: codes(RO_Z),
    newCardCodes: codes(RO_Z),
    sourcePage: 12,
  },
  {
    // §5.2: 18–20 cards, with or without leash; "2 Seitenwechsel von links auf rechts sind
    // erlaubt, wenn der Hund mit der nächsten Übung wieder in die linke Fußposition wechselt
    // bzw. rechtsgeführt ins Ziel geht. Startet der Hund rechtsgeführt, darf nur noch ein
    // zusätzlicher Wechsel von links auf rechts erfolgen. Mindestens 1 Seitenwechsel muss
    // erfolgen." CNDC: "Max. čtyři dvoukartové CNDC" (the club's slides).
    id: 'RO1-2027',
    ruleset: 'CZ-2027',
    name: 'RO1',
    course: {
      minCards: 18,
      maxCards: 20,
      leash: 'allowed',
      supplementary: D0_ALL,
      fields: course2026('RO1').fields,
      maxJumps: course2026('RO1').maxJumps,
      maxRepeats: MAX_REPEATS,
      sides: { stretch: 0, leftToRight: 2, minChanges: 1 },
      cndc: { groups: [1, 4], cards: 2 },
    },
    cardCodes: codes([...RO_Z, ...RO1]),
    newCardCodes: codes(RO1),
    sourcePage: 12,
  },
  {
    // §5.3: 20–22 cards, off leash; "2 Seitenwechsel von links auf rechts sind erlaubt, wenn
    // der Hund spätestens mit der übernächsten Übung wieder in die linke Fußposition wechselt
    // bzw. rechtsgeführt ins Ziel geht. Startet der Hund rechtsgeführt, darf nur noch ein
    // zusätzlicher Wechsel … Mindestens 1 Wechsel und eine rechtsgeführte Übung müssen
    // erfolgen."
    id: 'RO2-2027',
    ruleset: 'CZ-2027',
    name: 'RO2',
    course: {
      minCards: 20,
      maxCards: 22,
      leash: 'off-leash',
      supplementary: D0_ALL,
      fields: course2026('RO2').fields,
      maxJumps: course2026('RO2').maxJumps,
      maxRepeats: MAX_REPEATS,
      sides: { stretch: 1, leftToRight: 2, minChanges: 1, minRight: 1 },
      cndc: course2026('RO2').cndc,
    },
    cardCodes: codes([...RO_Z, ...RO1, ...RO2]),
    newCardCodes: codes(RO2),
    sourcePage: 13,
  },
  {
    // §5.4: 22–24 cards, off leash; "Mindestens 3 Übungen jedoch höchstens 1/3 aller
    // verwendeten Schilder sind rechtsgeführt."
    id: 'RO3-2027',
    ruleset: 'CZ-2027',
    name: 'RO3',
    course: {
      minCards: 22,
      maxCards: 24,
      leash: 'off-leash',
      supplementary: D0_ALL,
      fields: course2026('RO3').fields,
      maxJumps: course2026('RO3').maxJumps,
      maxRepeats: MAX_REPEATS,
      sides: { minRight: 3, maxRightShare: 1 / 3 },
      cndc: course2026('RO3').cndc,
    },
    cardCodes: codes([...RO_Z, ...RO1, ...RO2, ...RO3]),
    newCardCodes: codes(RO3),
    sourcePage: 13,
  },
  {
    // §5.5: "12-14 Übungsschildern zuzüglich den Start-, Ziel- und Zusatzschilder Z-a, Z-c und
    // Z-e … mit oder ohne Leine … 1 Übung aus den Schilder 123, 124, 126 oder 232 als 1. oder
    // letztes Schild im Parcours … Es darf nur ein Führseitenwechsel in der Senior-Klasse
    // erfolgen" — required on a competition course (the author, 2026-11-04). The cards:
    // Anhang 3 (S. 64–68, images); its "B-027" is a misprint for B-028, the 210° loop its card
    // shows.
    id: 'RO-V-2027',
    ruleset: 'CZ-2027',
    name: 'RO-V – veteráni',
    course: {
      minCards: 12,
      maxCards: 14,
      leash: 'allowed',
      supplementary: ['D0a', 'D0c', 'D0e'],
      fields: course2026('RO-V').fields,
      maxJumps: course2026('RO-V').maxJumps,
      maxRepeats: MAX_REPEATS,
      sides: { ends: true, minChanges: 1 },
      cndc: course2026('RO-V').cndc,
    },
    cardCodes: [
      ...[1, 2, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
        .concat([28, 30, 31, 32, 33, 34, 35, 36])
        .map((n) => `Z-${String(n).padStart(3, '0')}`),
      ...[102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 116, 117, 118, 119, 120]
        .concat([123, 124, 126, 127, 128, 129, 130])
        .map((n) => `1-${n}`),
      ...[208, 209, 211, 212, 213, 214, 215, 216, 220, 221, 223, 225, 227, 230, 231, 232, 233].map(
        (n) => `2-${n}`,
      ),
      ...[303, 307, 312, 318, 329, 332].map((n) => `3-${n}`),
    ],
    newCardCodes: [],
    sourcePage: 64,
  },
]

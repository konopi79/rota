import type { Exercise, ExerciseStep } from './exercise'
import { EXERCISES } from './exercises'

/**
 * FCI exercises (plan R19), from the national ones where the FCI rules describe the same
 * exercise (Zkušební řád & Směrnice pro Mezinárodní soutěže FCI Rally Obedience, the Czech
 * translation valid from 1 Feb 2025, §5): only the card, its place and its exercise space are
 * FCI's (`ruleset`, §4.3). Where FCI says otherwise — 1–2 m between two turns about, a sit
 * before the stand — the script is put together here from the same building blocks.
 */

/** A national exercise, or its variant (a D0 card, the pace before). */
const national = (code: string, variant?: string): Exercise => {
  const all = EXERCISES.filter((e) => e.code === code)
  const found = variant
    ? all.find((e) => e.supplementary === variant || e.fromPace === variant)
    : all[0]
  if (!found) throw new Error(`No national exercise ${code} ${variant ?? ''}`)
  return found
}

/**
 * The FCI card `code` played as the national exercise `from`: no D0 card (an FCI card says
 * how the dog finishes), the FCI card and space.
 */
const fci = (code: string, from: Exercise, patch: Partial<Exercise> = {}): Exercise => {
  const { supplementary: _, pairedWith: __, stopAt, ...rest } = from
  const clamp = (v: number) => Math.max(-MOST_OFF, Math.min(MOST_OFF, v))
  return {
    ...rest,
    ...(stopAt && { stopAt: { x: clamp(stopAt.x), z: clamp(stopAt.z) } }),
    code,
    ruleset: 'FCI',
    ...patch,
  }
}

/**
 * A national exercise that stops the handler off the middle of its square (room for the dog in
 * front, round the handler, a side step to come) stops at most this far off it in FCI's smaller
 * square (1 m, §4.3), metres — the shoes still in it.
 */
const MOST_OFF = 0.3

/** FCI card → the national exercise that is the same (variant: its D0 card or pace). */
const SAME: [string, string, string?][] = [
  // 101 Lehni: "Psovod se zastaví a pes ulehá přímo vedle psovoda" — 1-109 Zastavit – lehni.
  ['101', '1-109'],
  ['102', 'Z-002'],
  ['103', 'Z-004'],
  ['104', 'Z-005'],
  // "Tým společně provede těsný obrat o 180°" — within 50 cm (§4.6).
  ['105', 'Z-008'],
  ['106', 'Z-009'],
  ['109', 'Z-011'],
  ['110', 'Z-012'],
  ['111', 'Z-013'],
  ['112', '1-101'],
  ['113', 'Z-010'],
  // "Psovod provede na místě obrat vpravo v bok o 90° a zůstane stát" — on an A4 (§4.6).
  ['114', '1-105'],
  ['115', '1-106'],
  ['116', 'Z-015'],
  ['117', 'Z-016'],
  ['118', 'Z-017', 'slow'],
  ['118', 'Z-017', 'fast'],
  // "první kužel se vždy nachází po jeho levé straně" — as the national slaloms.
  ['121', 'Z-020'],
  ['122', 'Z-021'],
  ['204', 'Z-003'],
  ['205', '2-209'],
  ['206', '2-210'],
  ['207', '3-304'],
  // 209: "míjí psovoda zepředu po jeho pravé straně a zezadu jej obchází zpět k levé noze" —
  // Z-014 with D0a; 210 "přiřazení přímo k levé noze" — with D0b.
  ['209', 'Z-014', 'D0a'],
  ['210', 'Z-014', 'D0b'],
  ['213', '2-205'],
  ['214', '2-206'],
  ['215', '2-203'],
  ['216', '2-204'],
  ['217', '2-201'],
  ['218', '2-202'],
  ['219', '1-107'],
  // 220 Otočka: "pes provede v přímém směru kruhovou otočku ve směru od psovoda" — 2-219.
  ['220', '2-219'],
  ['301', '1-102'],
  ['303', '2-207'],
  ['304', '2-229'],
  // 306: the steps back of 1-108, then "velí psa do přiřazení k levé noze a pes usedá vlevo
  // vedle psovoda" — straight to the left leg, as D0b.
  ['306', '1-108', 'D0b'],
  // "Psovod se zastaví a pes vedle psovoda zůstane v pozici stůj" — without sitting first.
  ['307', '3-316'],
  ['308', '3-317'],
  ['309', '3-318'],
  ['310', '2-232'],
  ['311', '1-123'],
  // "pes i psovod provedou každý zvlášť těsný obrat o 180°" — the dog changes side.
  ['313', '3-325'],
  ['314', '3-326'],
  ['315', '1-124'],
  ['316', '1-125'],
  ['406', '3-327'],
  ['407', '2-208'],
  // 416: 2-222's steps aside with the dog in front, then "aby se přiřadil k levé noze a
  // zaujal pozici vsedě" — straight, as D0b.
  ['416', '2-222', 'D0b'],
]

/** The 1–2 m the team walks between two turns about (201–203: "Po 1 - 2 m"), metres. */
const BETWEEN_TURNS = 1.5

/** A national exercise with a walk put in after its step `after` (201–203). */
const walkAfter = (e: Exercise, after: number, walk: ExerciseStep): ExerciseStep[] => [
  ...e.steps.slice(0, after + 1),
  walk,
  ...e.steps.slice(after + 1),
]

/** The turn steps of a national exercise: where the walk goes in. */
const turnIndex = (e: Exercise) => e.steps.findIndex((s) => 'turn' in s)

/**
 * 201 2x čelem vzad, pes za psovodem: 1-116's two turns, but "Po 1 - 2 m provede psovod znovu
 * obrat" — 1-116 turns again at once.
 */
const R201 = (() => {
  const from = national('1-116')
  return fci('201', from, {
    steps: walkAfter(from, turnIndex(from), {
      walk: BETWEEN_TURNS,
      caption: 'onBetweenTurns',
    }),
  })
})()

/**
 * 202 / 203 Dvojitý obrat o 180°: 1-121's / 1-122's two turns on the spot, "Po 1 - 2 m" apart —
 * walked at the team's pace instead of 1-121's two steps.
 */
const doubleTurn = (code: string, nationalCode: string): Exercise => {
  const from = national(nationalCode)
  return fci(code, from, {
    steps: from.steps.map((s) =>
      'walk' in s && s.caption === 'twoStepsOn'
        ? { walk: BETWEEN_TURNS, caption: 'onBetweenTurns' }
        : s,
    ),
  })
}

/**
 * 208 Stop, stůj, okolo psa: "Psovod se zastaví a pes si sedá u nohy psovoda. Psovod velí psa do
 * pozice stůj. Zatímco pes zůstává stát, psovod jej obchází zepředu" — 3-303 stops into the
 * stand without sitting, so its own script: sit, stand, then round the standing dog.
 */
const R208: Exercise = {
  code: '208',
  ruleset: 'FCI',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 0.8, caption: 'basePosition' },
    { dog: 'stand', caption: 'standUp' },
    { wait: 0.8, caption: 'standHold' },
    { around: 'dog', caption: 'aroundStandingDog' },
    { wait: 1, caption: 'standHold' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * Before a card ahead (B) the team turns this much nearer the card than nationally, metres —
 * into the square in front of it, up to its middle (0.65; "na ploše A4", "o průměru maximálně
 * 50 cm", §4.6), as deep as the card stays clear (measured, the tests' limits plus 5 cm): at
 * 1.2 m the team only just came into it (110, the author). Turning left the dog keeps inside the
 * turn; turning right it swings out towards the card, so 105, 113, 114 and 217 stay where they
 * are, as do the side steps 301 and 303.
 */
const INTO_THE_SQUARE: Record<string, number> = {
  '106': 0.5,
  '109': 0.3,
  '110': 0.3,
  '115': 0.5,
  '213': 0.3,
  '214': 0.55,
  '215': 0.3,
  '216': 0.55,
  '218': 0.5,
  '304': 0.65,
  '307': 0.3,
  '308': 0.65,
  '310': 0.65,
  '313': 0.65,
  '314': 0.65,
}

/**
 * Where FCI's card says the exercise is done left of the card (A) though the national one has
 * it ahead: 416's steps aside with the dog in front (2-222 nationally a side step, before the
 * card — FCI §4.3 too, but the card's letter is A).
 */
const CARD_BESIDE = new Set(['416'])

/** The national exercise as FCI's card, a little nearer its card where it has to be. */
const same = (code: string, from: string, variant?: string): Exercise => {
  const e = fci(code, national(from, variant), CARD_BESIDE.has(code) ? { card: 'side' } : {})
  const nearer = INTO_THE_SQUARE[code]
  if (!nearer) return e
  const stop = e.stopAt ?? { x: 0, z: 0 }
  return { ...e, stopAt: { x: stop.x, z: stop.z + nearer } }
}

/** The FCI exercises, in card order. */
export const FCI_EXERCISES: Exercise[] = [
  ...SAME.map(([code, from, variant]) => same(code, from, variant)),
  R201,
  doubleTurn('202', '1-121'),
  doubleTurn('203', '1-122'),
  R208,
].sort((a, b) => a.code.localeCompare(b.code))

import { describe, expect, test } from 'bun:test'

import { CZ_CARDS } from '../cz'
import { CZ_CLASSES } from '../cz/classes'
import { dealDeck, validateDeck, type Deck, type DealOptions, type DeckEntry } from '../deal'
import { approachOf, shapeOf, signOf, turnsOf } from '../deal/geometry'
import { FCI_CARDS } from '../fci'
import { getCard } from '../registry'
import { EQUIPMENT, type Card, type Equipment } from '../schema'

const base: DealOptions = {
  classId: 'FCI-ROB',
  scope: 'all',
  count: 3,
  equipment: [...EQUIPMENT],
  startSide: 'left',
  seed: 1,
}
const exercises = FCI_CARDS.filter((c) => c.kind === 'exercise')
const czExercises = CZ_CARDS.filter((c) => c.kind === 'exercise')
const cz = (code: string) => getCard('CZ', code) as Card

/**
 * A hand-built course on the 20 × 20 m field: the start at the bottom edge facing up,
 * then each card straight ahead. `at` is [x, y] or [x, y, heading, turn].
 */
function course(
  cards: [string, number[]][],
  finish: number[] = [10, 3, 0],
  extra: Partial<DeckEntry>[] = [],
): Deck {
  const entries: DeckEntry[] = cards.map(([code, [x = 0, y = 0, heading = 0, turn = 0]], i) => ({
    code,
    side: 'left',
    pace: 'normal',
    at: { x, y, heading, turn },
    ...extra[i],
  }))
  const [fx = 0, fy = 0, fh = 0] = finish
  return {
    options: { ...base, count: entries.length },
    entries,
    layout: {
      width: 20,
      height: 20,
      rounds: [
        { first: 0, start: { x: 10, y: 19.5, heading: 0 }, finish: { x: fx, y: fy, heading: fh } },
      ],
    },
  }
}
const straight = (codes: string[]) =>
  course(
    codes.map((code, i) => [code, [10, 15 - 4 * i]]),
    [10, 15 - 4 * codes.length, 0],
  )

describe('field layout — validator', () => {
  test('accepts a straight course 4 m apart', () => {
    expect(validateDeck(straight(['101', '102', '103']))).toEqual([])
  })

  test('decks up to a course may be laid out', () => {
    const { layout: _, ...bare } = straight(['101'])
    expect(validateDeck(bare)).toContain('cards placed without a field layout')
    const unplaced = { ...bare, entries: bare.entries.map(({ at: _at, ...e }) => e) }
    expect(validateDeck(unplaced)).toEqual([])
    const long = straight(Array.from({ length: 21 }, () => '101'))
    expect(validateDeck(long)).toContain('21 cards laid out on one field, at most 20')
  })

  test('the start sits on the edge facing in', () => {
    const deck = straight(['101'])
    const round = deck.layout?.rounds[0]
    if (round) round.start = { x: 10, y: 15, heading: 0 }
    expect(validateDeck(deck)).toContain('#1: start not on the edge facing in')
  })

  test('3–5 m straight on between exercises', () => {
    expect(validateDeck(course([['101', [10, 17.5]]], [10, 13.5]))).toContain(
      '#1 101: 2.0 m from the previous exercise',
    )
    expect(validateDeck(course([['101', [12, 15]]], [12, 11]))).toContain(
      '#1 101: not straight on from the previous exercise',
    )
  })

  test('the direction changes only on the cards (author, 2026-10-21)', () => {
    // A corner after 101, which goes straight on.
    expect(
      validateDeck(
        course(
          [
            ['101', [10, 15]],
            ['102', [6, 15, 270]],
          ],
          [2, 15, 270],
        ),
      ),
    ).toContain('#2 102: changes direction between cards')
    // 105 turns about: the next card back the way the team came, not 135° off.
    const deck = course([
      ['105', [10, 15, 0, 180]],
      ['101', [7.17, 12.17, 315]],
    ])
    expect(validateDeck(deck)).toContain('#2 101: changes direction between cards')
  })

  test('after a turn about the team walks back beside its way in, on the side it turned', () => {
    // 308 turns about to the left: back 2 m to the right of the way out (west, going down).
    const turned = (x: number) =>
      course(
        [
          ['101', [10, 15]],
          ['308', [10, 11, 0, -180]],
          ['102', [x, 15, 180]],
        ],
        [x, 18.5, 180],
      )
    expect(validateDeck(turned(8))).toEqual([])
    expect(validateDeck(turned(12))).toContain('#3 102: not straight on from the previous exercise')
    // Without a turn about the team does not step aside.
    expect(
      validateDeck(
        course(
          [
            ['101', [10, 15]],
            ['102', [12, 11]],
          ],
          [12, 7],
        ),
      ),
    ).toContain('#2 102: not straight on from the previous exercise')
  })

  test('steps back stay clear of other exercises; the team walks on from the card', () => {
    // 305 steps 2 m back, to 1 m from where 101 was done.
    const errors = validateDeck(
      course(
        [
          ['101', [10, 15]],
          ['305', [10, 12]],
        ],
        [10, 8],
      ),
    )
    expect(errors).toContain('#2 305: steps back too close to #1 101')
    // The finish 4 m past 305 itself, not past where the steps back end.
    expect(errors.filter((e) => e.includes('from the previous exercise'))).toEqual([])
  })

  test('a card turns only the way it says', () => {
    expect(validateDeck(course([['101', [10, 15, 0, 90]]]))).toContain(
      '#1 101: turn 90° not allowed',
    )
    // 105 turns about: the finish 4 m back the way the team came.
    expect(validateDeck(course([['105', [10, 15, 0, 180]]], [10, 19, 180]))).toContain(
      'start and finish: too close',
    )
  })

  test('everything inside the field, cards clear of each other', () => {
    expect(validateDeck(course([['101', [10, 15]]], [10, 0.2]))).toContain(
      'finish after #1: outside the field',
    )
    // The spiral's cones run 6 m past the card.
    const spiral = course([['119', [10, 6]]], [10, 2])
    expect(validateDeck(spiral)).toContain('#1 119: cone outside the field')
  })

  test('a card may stand over the edge, the course may not (author, 2026-10-22)', () => {
    // 101 done 0.3 m from the right edge: the team walks off the field.
    const deck = course([['101', [19.7, 15]]], [19.7, 11])
    const round = deck.layout?.rounds[0]
    if (round) round.start = { x: 19.7, y: 19.5, heading: 0 }
    expect(validateDeck(deck)).toContain('#1 101: outside the field')
    expect(validateDeck(deck)).toContain('#1: start not on the edge facing in')
    // Done 0.5 m from it: its card stands 1.1 m to the right, 0.6 m outside — fine.
    const inside = course([['101', [19.5, 15]]], [19.5, 11])
    if (inside.layout?.rounds[0]) inside.layout.rounds[0].start = { x: 19.5, y: 19.5, heading: 0 }
    expect(validateDeck(inside)).toEqual([])
  })

  test('recall cone 5 m ahead and the next card 5 m past it; a recall card instead', () => {
    // 319 with its own recall cone: 5 m to the cone, 5 m on to the next card.
    expect(
      validateDeck(
        course(
          [
            ['319', [10, 15]],
            ['101', [10, 5]],
          ],
          [10, 2],
        ),
      ),
    ).toEqual([])
    expect(
      validateDeck(
        course(
          [
            ['319', [10, 15]],
            ['101', [10, 7]],
          ],
          [10, 3],
        ),
      ),
    ).toContain('#2 101: 3.0 m from the previous exercise')
    // 321 stands 4 m straight ahead of the leave card and turns the team about.
    const recall = course(
      [
        ['319', [10, 15]],
        ['321', [10, 11, 0, 180]],
      ],
      [10, 8.5, 180],
    )
    expect(validateDeck(recall)).toContain('finish after #2: -2.5 m from the previous exercise')
  })

  test('at most two jumps on the field', () => {
    const jumps = course(
      [
        ['320', [10, 17]],
        ['222', [10, 5, 0]],
      ],
      [10, 1],
    )
    // The start is 2 m from 320 — only the jump count matters here.
    expect(validateDeck(jumps)).toContain('#1: 3 jumps in a round, at most 2')
  })
})

describe('field layout — dealer', () => {
  const equipmentSets: Equipment[][] = [[], ['cones'], [...EQUIPMENT]]

  test('every FCI deck fits its field (property test)', () => {
    let decks = 0
    for (const equipment of equipmentSets) {
      for (const count of [5, 12, 20]) {
        for (let seed = 0; seed < 50; seed++) {
          const deck = dealDeck({
            ...base,
            equipment,
            count,
            seed,
            startSide: seed % 2 ? 'left' : 'right',
          })
          const errors = validateDeck(deck)
          if (errors.length) throw new Error(`${equipment}/${count}/seed ${seed}: ${errors}`)
          expect(deck.entries).toHaveLength(count)
          expect(deck.layout?.rounds).toHaveLength(1)
          decks++
        }
      }
    }
    expect(decks).toBe(450)
    // ~20 ms a deck: a dead end on the field takes cards back (`BACKTRACKS`).
  }, 60_000)

  test('FCI decks on the 20 × 30 m field fit it; an unknown field falls back to 20 × 20', () => {
    const field = { width: 20, height: 30 }
    for (let seed = 0; seed < 50; seed++) {
      for (const competition of [false, true]) {
        const deck = dealDeck({ ...base, count: 20, seed, competition, field })
        expect(deck.layout).toMatchObject(field)
        const errors = validateDeck(deck)
        if (errors.length) throw new Error(`seed ${seed}: ${errors}`)
      }
    }
    const odd = dealDeck({ ...base, count: 10, field: { width: 25, height: 25 } })
    expect(odd.layout).toMatchObject({ width: 20, height: 20 })
    expect(validateDeck(odd)).toEqual([])
  }, 30_000)

  test('a course spreads over the field instead of leaving a corner empty', () => {
    // The biggest empty spot: the point of the field farthest from every exercise. Without
    // steering a course left one of ~10.6 m radius on 20 × 30 m (6.3 m on 20 × 20).
    for (const [field, limit] of [
      [{ width: 20, height: 20 }, 6.1],
      [{ width: 20, height: 30 }, 9],
    ] as const) {
      let total = 0
      for (let seed = 0; seed < 60; seed++) {
        const deck = dealDeck({ ...base, count: 20, seed, competition: true, field })
        const round = deck.layout?.rounds[0]
        const points = [round?.start, round?.finish, ...deck.entries.map((e) => e.at)].filter(
          (p) => p !== undefined,
        )
        let biggest = 0
        for (let x = 1; x < field.width; x++) {
          for (let y = 1; y < field.height; y++) {
            const room = Math.min(...points.map((p) => Math.hypot(p.x - x, p.y - y)))
            biggest = Math.max(biggest, room)
          }
        }
        total += biggest
      }
      expect(total / 60).toBeLessThan(limit)
    }
  }, 30_000)

  test('the validator checks the deck is laid out on the field it asked for', () => {
    const deck = straight(['101', '102'])
    expect(validateDeck(deck)).toEqual([])
    const asked = { ...deck, options: { ...deck.options, field: { width: 20, height: 30 } } }
    expect(validateDeck(asked)).toEqual(['laid out on 20 × 20 m, not on 20 × 30 m'])
  })

  test('a deck longer than a course goes without a plan', () => {
    for (let seed = 0; seed < 10; seed++) {
      const deck = dealDeck({ ...base, count: 21 + seed * 6, seed })
      expect(deck.layout).toBeUndefined()
      expect(deck.entries.some((e) => e.at)).toBe(false)
      expect(validateDeck(deck)).toEqual([])
    }
  })

  test('a course stays on one field', () => {
    for (let seed = 0; seed < 50; seed++) {
      const deck = dealDeck({ ...base, count: 20, seed, competition: true })
      expect(deck.layout?.rounds).toHaveLength(1)
    }
  }, 30_000)
})

describe('national field layout (R14)', () => {
  test('every national deck and course fits its field (property test)', () => {
    for (const cls of CZ_CLASSES) {
      for (const field of cls.course.fields ?? []) {
        for (const competition of [false, true]) {
          for (let seed = 0; seed < 12; seed++) {
            const deck = dealDeck({
              ...base,
              classId: cls.id,
              count: cls.course.maxCards,
              seed,
              competition,
              field,
              startSide: seed % 3 ? 'left' : 'right',
            })
            const errors = validateDeck(deck)
            if (errors.length) throw new Error(`${cls.id}/${competition}/seed ${seed}: ${errors}`)
            expect(deck.entries).toHaveLength(cls.course.maxCards)
            expect([deck.layout?.width, deck.layout?.height]).toEqual([field.width, field.height])
          }
        }
      }
    }
    // ~40 ms an RO3 course: a dead end on the field takes cards back, as for FCI.
  }, 60_000)

  test('20 × 30 m by default (řád p. 7); RO2 and RO3 only there — their jumps need room', () => {
    for (const cls of CZ_CLASSES) {
      expect(cls.course.fields?.[0]).toEqual({ width: 20, height: 30 })
      expect(cls.course.fields).toHaveLength(cls.id === 'RO2' || cls.id === 'RO3' ? 1 : 2)
    }
  })

  test('a follow-up stands where its leave card says, or where it says itself', () => {
    const at = { x: 10, y: 20, heading: 0, turn: 0 }
    const after = (leave: string, follow: string) =>
      approachOf(shapeOf(cz(leave), at, 'left', true), cz(follow))
    expect(after('2-211', '2-215')).toEqual({ min: 4, max: 4, shifts: [0] })
    // Směrnice §1.1.2: "Cviky … 308, 320 a 321 potřebují minimální vzdálenost 6 m".
    expect(after('2-211', '3-321')).toEqual({ min: 6, max: 6, shifts: [0] })
    // 3-301 and 3-302: 180 cm to either side; 3-314: 5 m past its jump, to the jump's side.
    expect(after('3-301', '2-215').shifts).toEqual([-1.8, 1.8])
    expect(after('2-211', '3-302').shifts).toEqual([-1.8, 1.8])
    expect(after('3-314', '3-302')).toEqual({ min: 10, max: 10, shifts: [-1.8] })
    expect(after('2-218', '2-215')).toEqual({ min: 10, max: 10, shifts: [0] })
  })

  test('jumps 5 m from the card before and after them; 8 m at least after 3-323', () => {
    const at = { x: 10, y: 25, heading: 0, turn: 0 }
    const jump = shapeOf(cz('2-217'), at, 'left', false)
    expect(jump.props.map((p) => [p.kind, 25 - p.y])).toEqual([['jump', 5]])
    expect(approachOf(jump, undefined).min).toBe(5)
    const run = shapeOf(cz('3-323'), at, 'left', false)
    // "Cvik vyžaduje minimální vzdálenost 8 m k dalšímu cviku" — the team is further on by then.
    expect(25 - run.exit.y + approachOf(run, undefined).min).toBeGreaterThanOrEqual(8)
  })

  test('national cards keep their layout with the dog on the right — a jump goes to its side', () => {
    const at = { x: 10, y: 20, heading: 0, turn: 90 }
    const jumps = (card: Card) => card.geometry?.props?.some((p) => p.kind === 'jump')
    for (const card of czExercises.filter((c) => !jumps(c))) {
      expect([card.code, shapeOf(card, at, 'right', false)]).toEqual([
        card.code,
        shapeOf(card, at, 'left', false),
      ])
    }
    const jump = (side: 'left' | 'right') => shapeOf(cz('2-217'), at, side, false).props[0]!
    // Heading up the plan: left is −x, right +x.
    expect(jump('left').x).toBeCloseTo(9)
    expect(jump('right').x).toBeCloseTo(11)
  })

  test('the card left before the team, or before it for a change of direction (§5.3.1)', () => {
    const at = { x: 10, y: 20, heading: 0, turn: 0 }
    expect(signOf(cz('Z-001'), at)).toEqual({ x: 10.75, y: 19.55 })
    expect(signOf(cz('Z-006'), at)).toEqual({ x: 10, y: 18.8 })
    // Beside a line of cones, where its animation has it.
    expect(signOf(cz('Z-020'), at)).toEqual({ x: 9, y: 19.5 })
    for (const card of czExercises) {
      const turns = turnsOf(card).some((t) => t % 360 !== 0)
      if (turns && !card.geometry?.props)
        expect([card.code, card.placement]).toEqual([card.code, 'B'])
    }
  })

  test('the way between two cards passes clear of the others (Směrnice §1.1.3)', () => {
    const deck = dealDeck({ ...base, classId: 'RO-Z', count: 18, seed: 1, competition: true })
    expect(validateDeck(deck)).toEqual([])
    const [first, second, third] = deck.entries
    if (!first?.at || !second?.at || !third?.at) throw new Error('not laid out')
    // The third exercise moved onto the way from the first card to the second.
    const exit = shapeOf(cz(first.code), first.at, first.side, false).exit
    third.at = { ...third.at, x: (exit.x + second.at.x) / 2, y: (exit.y + second.at.y) / 2 }
    expect(validateDeck(deck)).toContain(
      `#2 ${second.code}: the way to it passes too close to #3 ${third.code}`,
    )
  })

  test('nothing within 3 m of the 3-324 cone (Směrnice §1.1.3)', () => {
    const cone = shapeOf(cz('3-324'), { x: 10, y: 20, heading: 0, turn: 0 }, 'left', false)
    expect(cone.props.map((p) => p.clear)).toEqual([3])
  })
})

describe('card geometry', () => {
  test('equipment on the field matches the equipment filter', () => {
    for (const card of [...exercises, ...czExercises]) {
      const kinds = new Set(card.geometry?.props?.map((p) => p.kind))
      const equipment = card.sequencing.equipment ?? []
      expect([card.code, kinds.has('jump')]).toEqual([card.code, equipment.includes('jump')])
      expect([card.code, kinds.has('bowl')]).toEqual([card.code, equipment.includes('bowls')])
      if (kinds.has('cone')) expect(equipment).toContain('cones')
    }
  })

  test('leave cards bring a recall cone, recall cards their distance', () => {
    for (const card of [...exercises, ...czExercises]) {
      if (card.sequencing.mayBeFollowedBy) expect(card.geometry?.recallCone).toBe(true)
      expect([card.code, !!card.sequencing.onlyAfterLeave]).toEqual([
        card.code,
        !!card.geometry?.fromPrevious,
      ])
    }
  })

  test('steps back end behind the card, the team walks on from the card', () => {
    const card = exercises.find((c) => c.code === '306')
    if (!card) throw new Error('306 missing')
    const shape = shapeOf(card, { x: 10, y: 10, heading: 0, turn: 0 }, 'left', false)
    expect(shape.back).toMatchObject({ x: 10, y: 14 })
    expect(shape.exit).toMatchObject({ x: 10, y: 10, heading: 0 })
  })

  test('a recall card replaces the recall cone of the leave card', () => {
    const leave = exercises.find((c) => c.code === '408')
    if (!leave) throw new Error('408 missing')
    const at = { x: 10, y: 10, heading: 0, turn: 0 }
    expect(shapeOf(leave, at, 'left', false).props).toHaveLength(1)
    expect(shapeOf(leave, at, 'left', false).exit).toMatchObject({ x: 10, y: 5 })
    expect(shapeOf(leave, at, 'left', true).props).toHaveLength(0)
    // The recall cone stands 1 m off the line, away from the dog.
    expect(shapeOf(leave, at, 'left', false).props[0]?.x).toBeCloseTo(11)
  })
})

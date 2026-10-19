import { describe, expect, test } from 'bun:test'

import { CZ_CARDS } from '../cz'
import { dealDeck, validateDeck, type Deck, type DealOptions, type DeckEntry } from '../deal'
import { shapeOf } from '../deal/geometry'
import { FCI_CARDS } from '../fci'
import { EQUIPMENT, type Equipment } from '../schema'

const base: DealOptions = {
  classId: 'FCI-ROB',
  scope: 'all',
  count: 3,
  equipment: [...EQUIPMENT],
  startSide: 'left',
  seed: 1,
}
const exercises = FCI_CARDS.filter((c) => c.kind === 'exercise')

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
        { first: 0, start: { x: 10, y: 19, heading: 0 }, finish: { x: fx, y: fy, heading: fh } },
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

  test('FCI decks need a layout, national ones must not have one', () => {
    const { layout: _, ...bare } = straight(['101'])
    expect(validateDeck(bare)).toContain('no field layout')
    const national = { ...straight(['Z-001']), options: { ...base, classId: 'RO1' as const } }
    expect(validateDeck(national)).toContain('RO1 is not laid out')
  })

  test('the start sits on the edge facing in', () => {
    const deck = straight(['101'])
    const round = deck.layout?.rounds[0]
    if (round) round.start = { x: 10, y: 15, heading: 0 }
    expect(validateDeck(deck)).toContain('#1: start not on the edge facing in')
  })

  test('3–5 m between exercises, facing the way the team comes', () => {
    expect(validateDeck(course([['101', [10, 17]]], [10, 13]))).toContain(
      '#1 101: 2.0 m from the previous exercise',
    )
    expect(validateDeck(course([['101', [10, 15, 30]]], [12, 11.5, 30]))).toContain(
      '#1 101: not facing the way the team comes',
    )
  })

  test('no turn sharper than 90° between cards', () => {
    // 4 m backwards and to the side: a 135° bend without a card.
    const deck = course([
      ['105', [10, 15, 0, 180]],
      ['101', [7.17, 12.17, 315]],
    ])
    expect(validateDeck(deck)).toContain('#2 101: turn of more than 90° between cards')
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
    expect(validateDeck(course([['101', [10, 15]]], [10, 0.5]))).toContain(
      'finish after #1: outside the field',
    )
    // The spiral's cones run 6 m past the card.
    const spiral = course([['119', [10, 6]]], [10, 2])
    expect(validateDeck(spiral)).toContain('#1 119: cone outside the field')
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
    expect(validateDeck(recall)).toContain('finish after #2: 2.5 m from the previous exercise')
    expect(validateDeck(recall)).toContain('finish after #2: not facing the way the team comes')
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
      for (const count of [5, 12, 20, 40, 89]) {
        for (let seed = 0; seed < 40; seed++) {
          const deck = dealDeck({
            ...base,
            equipment,
            count,
            seed,
            startSide: seed % 2 ? 'left' : 'right',
          })
          const errors = validateDeck(deck)
          if (errors.length) throw new Error(`${equipment}/${count}/seed ${seed}: ${errors}`)
          expect(deck.layout).toBeDefined()
          decks++
        }
      }
    }
    expect(decks).toBe(600)
    // Long decks retry the last round a few times; ~30 ms each.
  }, 30_000)

  test('a long deck is split into rounds of at most a course', () => {
    for (let seed = 0; seed < 20; seed++) {
      const deck = dealDeck({ ...base, count: 50, seed })
      expect(deck.entries).toHaveLength(50)
      const firsts = deck.layout?.rounds.map((r) => r.first) ?? []
      // Planned at 0, 17 and 33; a field that fills up early adds a round.
      expect(firsts.length).toBeGreaterThanOrEqual(3)
      const sizes = firsts.map((f, i) => (firsts[i + 1] ?? 50) - f)
      expect(Math.max(...sizes)).toBeLessThanOrEqual(20)
    }
  })

  test('a course stays on one field', () => {
    for (let seed = 0; seed < 50; seed++) {
      const deck = dealDeck({ ...base, count: 20, seed, competition: true })
      expect(deck.layout?.rounds).toHaveLength(1)
    }
  })

  test('national decks are not laid out', () => {
    const deck = dealDeck({ ...base, classId: 'RO3', count: 20 })
    expect(deck.layout).toBeUndefined()
    expect(deck.entries.some((e) => e.at)).toBe(false)
  })
})

describe('card geometry', () => {
  test('only FCI cards have it', () => {
    expect(CZ_CARDS.filter((c) => c.geometry).map((c) => c.code)).toEqual([])
  })

  test('equipment on the field matches the equipment filter', () => {
    for (const card of exercises) {
      const kinds = new Set(card.geometry?.props?.map((p) => p.kind))
      const equipment = card.sequencing.equipment ?? []
      expect([card.code, kinds.has('jump')]).toEqual([card.code, equipment.includes('jump')])
      expect([card.code, kinds.has('bowl')]).toEqual([card.code, equipment.includes('bowls')])
      if (kinds.has('cone')) expect(equipment).toContain('cones')
    }
  })

  test('leave cards bring a recall cone, recall cards their distance', () => {
    for (const card of exercises) {
      if (card.sequencing.mayBeFollowedBy) expect(card.geometry?.recallCone).toBe(true)
      expect([card.code, !!card.sequencing.onlyAfterLeave]).toEqual([
        card.code,
        !!card.geometry?.fromPrevious,
      ])
    }
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

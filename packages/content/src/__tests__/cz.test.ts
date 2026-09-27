import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { CZ_CARDS, CZ_CLASSES } from '../cz'
import { cardSchema, roClassSchema } from '../schema'

const IMAGES = join(import.meta.dir, '../../../../apps/web/public/cards/cz')
const byCode = new Map(CZ_CARDS.map((c) => [c.code, c]))
const exercises = CZ_CARDS.filter((c) => c.kind === 'exercise')
const classOf = (id: string) => {
  const found = CZ_CLASSES.find((c) => c.id === id)
  if (!found) throw new Error(`class ${id} missing`)
  return found
}

describe('national cards', () => {
  test('every card matches the schema', () => {
    for (const card of CZ_CARDS) expect(cardSchema.safeParse(card).error).toBeUndefined()
  })

  test('codes are unique', () => {
    expect(byCode.size).toBe(CZ_CARDS.length)
  })

  test('counts match the regulation (příloha 1)', () => {
    const count = (prefix: string) => exercises.filter((c) => c.code.startsWith(prefix)).length
    expect(count('Z-')).toBe(32)
    expect(count('1-')).toBe(25)
    expect(count('2-')).toBe(32)
    expect(count('3-')).toBe(27)
    expect(CZ_CARDS.filter((c) => c.kind === 'supplementary').map((c) => c.code)).toEqual([
      'D0a',
      'D0b',
      'D0c',
      'D0d',
    ])
    expect(CZ_CARDS.filter((c) => c.kind === 'start' || c.kind === 'finish')).toHaveLength(2)
  })

  test('every card has its images', () => {
    for (const card of CZ_CARDS) {
      expect(existsSync(join(IMAGES, `${card.image}.webp`))).toBe(true)
      expect(existsSync(join(IMAGES, 'thumb', `${card.image}.webp`))).toBe(true)
      if (card.diagram) expect(existsSync(join(IMAGES, `${card.diagram}.webp`))).toBe(true)
    }
  })

  test('exercises have a type; supplementary pairing ⇔ type decided by the D0 card', () => {
    for (const card of exercises) {
      expect(card.exerciseType).toBeDefined()
      expect(card.exerciseType === 'AB').toBe(card.sequencing.requiresSupplementary === true)
    }
  })
})

describe('national sequencing rules', () => {
  const followUps = new Set(exercises.flatMap((c) => c.sequencing.nextOneOf ?? []))

  test('follow-up lists name existing exercises', () => {
    for (const code of followUps) expect(byCode.get(code)?.kind).toBe('exercise')
  })

  test('a card is a leave follow-up exactly when some leave card lists it', () => {
    const flagged = exercises.filter((c) => c.sequencing.onlyAfterLeave).map((c) => c.code)
    expect(new Set(flagged)).toEqual(followUps)
  })

  test('leave cards end static and are not follow-ups themselves', () => {
    for (const card of exercises.filter((c) => c.sequencing.nextOneOf)) {
      expect(card.sequencing.onlyAfterLeave).toBeUndefined()
    }
  })

  test('pace cards: slow Z-015, fast Z-016 and 1-110, normal Z-017', () => {
    const pace = Object.fromEntries(
      exercises.filter((c) => c.sequencing.pace).map((c) => [c.code, c.sequencing.pace]),
    )
    expect(pace).toEqual({ 'Z-015': 'slow', 'Z-016': 'fast', 'Z-017': 'normal', '1-110': 'fast' })
  })

  test('3-311 (down) drops the follow-ups that start with a down (struck on p. 55)', () => {
    const list = byCode.get('3-311')?.sequencing.nextOneOf ?? []
    expect(list).not.toContain('3-309')
    expect(list).not.toContain('3-322')
    expect(byCode.get('3-312')?.sequencing.nextOneOf).toContain('3-309')
  })

  test('last-only cards belong to the class they are restricted in', () => {
    for (const card of exercises) {
      for (const id of card.sequencing.lastOnly ?? []) {
        expect(classOf(id).cardCodes).toContain(card.code)
      }
    }
  })
})

describe('national classes', () => {
  test('every class matches the schema and lists existing exercises', () => {
    for (const cls of CZ_CLASSES) {
      expect(roClassSchema.safeParse(cls).error).toBeUndefined()
      for (const code of cls.cardCodes) expect(byCode.get(code)?.kind).toBe('exercise')
      expect(new Set(cls.cardCodes).size).toBe(cls.cardCodes.length)
    }
  })

  test('RO-Z…RO3 are cumulative and add their own cards', () => {
    const ladder = ['RO-Z', 'RO1', 'RO2', 'RO3'].map(classOf)
    ladder.forEach((cls, i) => {
      const lower = i > 0 ? (ladder[i - 1]?.cardCodes ?? []) : []
      expect(cls.cardCodes).toEqual([...lower, ...cls.newCardCodes])
    })
    expect(classOf('RO3').cardCodes).toHaveLength(32 + 25 + 32 + 27)
  })

  test('RO-V: 54 cards from the overview, only D0a and D0c', () => {
    const roV = classOf('RO-V')
    expect(roV.cardCodes).toHaveLength(27 + 15 + 9 + 3)
    expect(roV.course.supplementary).toEqual(['D0a', 'D0c'])
  })

  test('every leave card has a follow-up available in each class that contains it', () => {
    for (const cls of CZ_CLASSES) {
      const inClass = new Set(cls.cardCodes)
      for (const code of cls.cardCodes) {
        const next = byCode.get(code)?.sequencing.nextOneOf
        if (next) expect(next.some((c) => inClass.has(c))).toBe(true)
      }
    }
  })
})

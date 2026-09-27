import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { FCI_CARDS, FCI_CLASSES } from '../fci'
import { cardSchema, roClassSchema } from '../schema'

const IMAGES = join(import.meta.dir, '../../../../apps/web/public/cards/fci')
const byCode = new Map(FCI_CARDS.map((c) => [c.code, c]))
const exercises = FCI_CARDS.filter((c) => c.kind === 'exercise')
const codes = (pred: (c: (typeof exercises)[number]) => unknown) =>
  exercises.filter(pred).map((c) => c.code)

describe('FCI cards', () => {
  test('every card matches the schema; codes are unique', () => {
    for (const card of FCI_CARDS) expect(cardSchema.safeParse(card).error).toBeUndefined()
    expect(byCode.size).toBe(FCI_CARDS.length)
  })

  test('89 exercises: 22 one-point, 22 two-point, 23 three-point, 22 four-point', () => {
    for (const [points, count] of [
      [1, 22],
      [2, 22],
      [3, 23],
      [4, 22],
    ] as const) {
      const group = exercises.filter((c) => c.points === points)
      expect(group).toHaveLength(count)
      for (const card of group) expect(card.code[0]).toBe(String(points))
    }
    expect(byCode.get('START')?.kind).toBe('start')
    expect(byCode.get('FINISH')?.kind).toBe('finish')
  })

  test('every card has its images', () => {
    for (const card of FCI_CARDS) {
      expect(existsSync(join(IMAGES, `${card.image}.webp`))).toBe(true)
      expect(existsSync(join(IMAGES, 'thumb', `${card.image}.webp`))).toBe(true)
    }
  })

  test('FCI letters are placements, never national static/dynamic types', () => {
    for (const card of exercises) {
      expect(card.placement).toBeDefined()
      expect(card.exerciseType).toBeUndefined()
      expect(card.nameEn).toBeDefined()
    }
    expect(codes((c) => c.placement === 'D')).toEqual(['222', '320'])
  })
})

describe('FCI sequencing rules', () => {
  test('pace: 116 slow, 117 fast, 118 normal; only 105–113 in slow/fast pace', () => {
    expect(codes((c) => c.sequencing.pace)).toEqual(['116', '117', '118'])
    expect(codes((c) => c.sequencing.paceCompatible)).toEqual([
      '105',
      '106',
      '107',
      '108',
      '109',
      '110',
      '111',
      '112',
      '113',
    ])
  })

  test('side: changes, fixed end sides, 417/418 start sides', () => {
    expect(codes((c) => c.sequencing.sideChange)).toEqual([
      '310',
      '311',
      '312',
      '313',
      '314',
      '315',
      '316',
      '405',
      '406',
    ])
    expect(byCode.get('417')?.sequencing).toMatchObject({ sideOnly: 'left', endSide: 'right' })
    expect(byCode.get('418')?.sequencing).toMatchObject({ sideOnly: 'right', endSide: 'left' })
    expect(codes((c) => c.sequencing.endSide === 'left')).toContain('209')
  })

  test('recall cards may only follow 319, 408, 409 — which do not require one', () => {
    const leave = codes((c) => c.sequencing.mayBeFollowedBy)
    expect(leave).toEqual(['319', '408', '409'])
    const recalls = new Set(exercises.flatMap((c) => c.sequencing.mayBeFollowedBy ?? []))
    expect(new Set(codes((c) => c.sequencing.onlyAfterLeave))).toEqual(recalls)
    expect(codes((c) => c.sequencing.nextOneOf)).toEqual([])
  })

  test('the class: all 89 exercises, 18–20 cards, off leash, a card at most twice', () => {
    const [cls] = FCI_CLASSES
    expect(roClassSchema.safeParse(cls).error).toBeUndefined()
    expect(cls?.cardCodes).toHaveLength(89)
    expect(cls?.course).toMatchObject({
      minCards: 18,
      maxCards: 20,
      leash: 'off-leash',
      paceCompatibleOnly: true,
      maxRepeats: 2,
    })
  })
})

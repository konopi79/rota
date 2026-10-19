import { describe, expect, test } from 'bun:test'

import { fitGrid } from '../grid'

const CARD = 400 / 283

describe('fitGrid', () => {
  test('a portrait phone fits a 20-card course in three columns', () => {
    const grid = fitGrid({ count: 20, width: 390, height: 780, aspect: CARD, gap: 6 })
    expect(grid.columns).toBe(3)
    const rows = Math.ceil(20 / grid.columns)
    expect(rows * (grid.itemWidth / CARD) + (rows - 1) * 6).toBeLessThanOrEqual(780)
  })

  test('a landscape phone uses more columns', () => {
    const grid = fitGrid({ count: 20, width: 844, height: 340, aspect: CARD, gap: 6 })
    expect(grid.columns).toBeGreaterThanOrEqual(5)
  })

  test('the cards never overflow the box', () => {
    for (const count of [1, 7, 12, 18, 24, 40]) {
      for (const [width, height] of [
        [360, 640],
        [640, 360],
        [1024, 768],
      ] as const) {
        const { columns, itemWidth } = fitGrid({ count, width, height, aspect: CARD, gap: 6 })
        const rows = Math.ceil(count / columns)
        expect(columns * itemWidth + (columns - 1) * 6).toBeLessThanOrEqual(width)
        expect(rows * (itemWidth / CARD) + (rows - 1) * 6).toBeLessThanOrEqual(height)
      }
    }
  })
})

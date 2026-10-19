import { beforeEach, describe, expect, test } from 'bun:test'
import { getClass, type RoClass } from '@rota/content'

import {
  adoptCustomCourse,
  defaultSetup,
  dismissInstallHint,
  isInstallHintDismissed,
  loadCustomCourse,
  loadSetup,
  quizStatsSnapshot,
  resetQuizStats,
  saveCustomCourse,
  saveQuizStats,
  saveSetup,
} from '../storage'

class MemoryStorage {
  private data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
  removeItem = (k: string) => void this.data.delete(k)
  clear = () => this.data.clear()
}

const ro1 = getClass('RO1') as RoClass
const roV = getClass('RO-V') as RoClass

beforeEach(() => {
  ;(globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage()
})

describe('setup storage', () => {
  test('defaults to the whole class, a competition-sized deck, no equipment', () => {
    expect(loadSetup(ro1)).toEqual({
      scope: 'all',
      count: 20,
      equipment: [],
      startSide: 'left',
      showDescription: false,
      speak: false,
    })
  })

  test('setups stored before the speech option load with speech off', () => {
    const stored = { ...defaultSetup(ro1), count: 9 } as Record<string, unknown>
    delete stored.speak
    localStorage.setItem('rota:v1', JSON.stringify({ setups: { RO1: stored } }))
    expect(loadSetup(ro1)).toEqual({ ...defaultSetup(ro1), count: 9, speak: false })
  })

  test('remembers the last setup per class', () => {
    const setup = { ...defaultSetup(ro1), count: 7, equipment: ['cones' as const] }
    saveSetup('RO1', setup)
    expect(loadSetup(ro1)).toEqual(setup)
    expect(loadSetup(roV)).toEqual(defaultSetup(roV))
  })

  test('falls back to defaults on unreadable data', () => {
    localStorage.setItem('rota:v1', '{not json')
    expect(loadSetup(ro1)).toEqual(defaultSetup(ro1))
    localStorage.setItem('rota:v1', JSON.stringify({ setups: { RO1: { count: 'lots' } } }))
    expect(loadSetup(ro1)).toEqual(defaultSetup(ro1))
  })

  test('works without local storage at all', () => {
    delete (globalThis as { localStorage?: unknown }).localStorage
    expect(loadSetup(ro1)).toEqual(defaultSetup(ro1))
    expect(() => saveSetup('RO1', defaultSetup(ro1))).not.toThrow()
  })

  test('remembers a dismissed install hint without touching the setups', () => {
    saveSetup('RO1', { ...defaultSetup(ro1), count: 5 })
    expect(isInstallHintDismissed()).toBe(false)
    dismissInstallHint()
    expect(isInstallHintDismissed()).toBe(true)
    expect(loadSetup(ro1).count).toBe(5)
  })

  test('quiz answers: saved, and reset per set of cards', () => {
    saveQuizStats({ 'CZ:Z-001': { right: 2, wrong: 0 }, 'FCI:101': { right: 0, wrong: 1 } })
    resetQuizStats(['CZ:Z-001'])
    expect(JSON.parse(quizStatsSnapshot())).toEqual({ 'FCI:101': { right: 0, wrong: 1 } })
  })
})

describe('custom course storage', () => {
  test('is empty until saved, then kept per class next to the setups', () => {
    expect(loadCustomCourse(ro1)).toEqual({
      startSide: 'left',
      cards: [],
      checks: true,
      guidelines: false,
    })
    const course = {
      startSide: 'right' as const,
      cards: [{ code: 'Z-014', supplementary: 'D0a' }, { code: 'Z-001' }],
      checks: false,
      guidelines: true,
    }
    saveSetup('RO1', { ...defaultSetup(ro1), count: 5 })
    saveCustomCourse('RO1', course)
    expect(loadCustomCourse(ro1)).toEqual(course)
    expect(loadCustomCourse(roV).cards).toEqual([])
    expect(loadSetup(ro1).count).toBe(5)
  })

  test('adopting a course asks before replacing a different one in progress', () => {
    const off = { checks: true, guidelines: false }
    const a = { startSide: 'left' as const, cards: [{ code: 'Z-001' }], ...off }
    const b = { startSide: 'left' as const, cards: [{ code: 'Z-006' }], ...off }
    let asked = 0
    const decline = () => (asked++, false)
    expect(adoptCustomCourse(ro1, a, decline)).toBe(true)
    expect(adoptCustomCourse(ro1, a, decline)).toBe(true)
    // Only the check switches differ: nothing to lose, nothing to ask.
    expect(adoptCustomCourse(ro1, { ...a, checks: false, guidelines: true }, decline)).toBe(true)
    expect(asked).toBe(0)
    expect(adoptCustomCourse(ro1, a, decline)).toBe(true)
    expect(adoptCustomCourse(ro1, b, decline)).toBe(false)
    expect(asked).toBe(1)
    expect(loadCustomCourse(ro1)).toEqual(a)
    expect(adoptCustomCourse(ro1, b, () => true)).toBe(true)
    expect(loadCustomCourse(ro1)).toEqual(b)
  })

  test('courses saved before the check switches load checked, without the guidelines', () => {
    const stored = { setups: {}, customCourses: { RO1: { startSide: 'left', cards: [] } } }
    localStorage.setItem('rota:v1', JSON.stringify(stored))
    expect(loadCustomCourse(ro1)).toMatchObject({ checks: true, guidelines: false })
  })

  test('drops cards the ruleset does not know', () => {
    saveCustomCourse('RO1', {
      startSide: 'left',
      cards: [{ code: 'Z-001' }, { code: 'Z-999' }, { code: 'Z-014', supplementary: 'D0x' }],
      checks: true,
      guidelines: false,
    })
    expect(loadCustomCourse(ro1).cards).toEqual([{ code: 'Z-001' }])
  })
})

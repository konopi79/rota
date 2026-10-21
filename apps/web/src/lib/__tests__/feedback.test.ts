import { describe, expect, test } from 'bun:test'

import {
  describeDevice,
  FEEDBACK_FORM_URL,
  FEEDBACK_KINDS,
  feedbackUrl,
  lastPage,
  pageField,
  rememberPage,
} from '../feedback'

const DECK = 'https://rotapp.cz/balicek?trida=RO1&pocet=20&seed=123&karta=4'

const filled = (url: string) => {
  const [base, query] = url.split('?')
  return { base, params: Object.fromEntries(new URLSearchParams(query)) }
}

describe('feedback form link', () => {
  test('prefills the page without its scheme, the version and the device', () => {
    const { base, params } = filled(
      feedbackUrl({ href: DECK, version: '21. 10. 2026 14:05', device: 'iPhone · z plochy' }),
    )
    expect(base).toBe(FEEDBACK_FORM_URL)
    expect(params).toEqual({
      usp: 'pp_url',
      'entry.1477301897': 'rotapp.cz/balicek?trida=RO1&pocet=20&seed=123&karta=4',
      'entry.1316240633': '21. 10. 2026 14:05',
      'entry.666559346': 'iPhone · z plochy',
    })
  })

  test('preselects the kind with the form’s own option text', () => {
    const { params } = filled(
      feedbackUrl({ kind: 'card', href: 'https://rotapp.cz/karta/cz/z-014' }),
    )
    expect(params['entry.1410061809']).toBe(FEEDBACK_KINDS.card)
    expect(params['entry.1410061809']).toBe('Chyba v kartě nebo pravidlu')
  })

  test('leaves out what is unknown', () => {
    const { params } = filled(feedbackUrl({ href: 'http://localhost:3004/' }))
    expect(params).toEqual({ usp: 'pp_url', 'entry.1477301897': 'localhost:3004/' })
  })

  test('device: user agent, home screen or browser, viewport', () => {
    expect(describeDevice({ userAgent: 'UA', installed: true, width: 390, height: 844 })).toBe(
      'UA · z plochy · 390×844',
    )
    expect(describeDevice({ userAgent: 'UA', installed: false, width: 1280, height: 720 })).toBe(
      'UA · v prohlížeči · 1280×720',
    )
  })

  test('page field: the page, the one before it and an edited course', () => {
    expect(pageField({ href: 'https://rotapp.cz/', previous: DECK })).toBe(
      'rotapp.cz/ · předtím: rotapp.cz/balicek?trida=RO1&pocet=20&seed=123&karta=4',
    )
    expect(pageField({ href: DECK, previous: DECK })).toBe(
      'rotapp.cz/balicek?trida=RO1&pocet=20&seed=123&karta=4',
    )
    expect(
      pageField({
        href: 'https://rotapp.cz/trida/ro1/vlastni',
        course: 'https://rotapp.cz/parkur?trida=RO1&poradi=1-101,Z-014.D0a',
      }),
    ).toBe(
      'rotapp.cz/trida/ro1/vlastni · parkur: rotapp.cz/parkur?trida=RO1&poradi=1-101,Z-014.D0a',
    )
  })

  test('remembers the last page except home and About', () => {
    const store = new Map<string, string>()
    globalThis.sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    } as Storage
    try {
      expect(lastPage()).toBeUndefined()
      rememberPage('/balicek', DECK)
      rememberPage('/', 'https://rotapp.cz/')
      rememberPage('/o-aplikaci', 'https://rotapp.cz/o-aplikaci')
      expect(lastPage()).toBe(DECK)
      rememberPage('/karta/cz/z-014', 'https://rotapp.cz/karta/cz/z-014')
      expect(lastPage()).toBe('https://rotapp.cz/karta/cz/z-014')
    } finally {
      delete (globalThis as { sessionStorage?: Storage }).sessionStorage
    }
  })
})

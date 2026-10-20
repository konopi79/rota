import { describe, expect, test } from 'bun:test'

import type { CountHit } from '../analytics'
import {
  createErrorReporter,
  describeError,
  errorEventPath,
  firstStackFrame,
  MAX_REPORTS,
  pageUrl,
  stripOrigin,
} from '../error-report'

const ORIGIN = 'https://rotapp.cz'
const DECK = `${ORIGIN}/balicek?trida=RO1&pocet=20&seed=123&karta=4`

function setup(href = DECK) {
  const hits: CountHit[] = []
  const report = createErrorReporter({
    send: (hit) => hits.push(hit),
    page: () => ({ href, origin: ORIGIN }),
  })
  return { hits, report }
}

describe('error reports', () => {
  test('describe errors, strings and anything else thrown', () => {
    expect(describeError(new TypeError('x is not a function'))).toEqual({
      name: 'TypeError',
      message: 'x is not a function',
    })
    expect(describeError('boom')).toEqual({ name: 'Error', message: 'boom' })
    expect(describeError({ code: 7 })).toEqual({ name: 'object', message: '{"code":7}' })
    expect(describeError(undefined)).toEqual({ name: 'undefined', message: 'undefined' })
  })

  test('first stack frame in Safari and Chrome format', () => {
    const chunk = `${ORIGIN}/_next/static/chunks/0abc.js:1:2345`
    expect(firstStackFrame(`deal@${chunk}\nfoo@${ORIGIN}/x.js:3:4`)).toBe(chunk)
    expect(firstStackFrame(`TypeError: x\n    at deal (${chunk})\n    at y (z.js:1:1)`)).toBe(chunk)
    expect(firstStackFrame('no frames here')).toBeUndefined()
    expect(firstStackFrame(undefined)).toBeUndefined()
  })

  test('own origin dropped from the source, the page address keeps host and query', () => {
    expect(stripOrigin(`${ORIGIN}/_next/a.js:1:2`, ORIGIN)).toBe('/_next/a.js:1:2')
    expect(stripOrigin('https://other.example/a.js:1:2', ORIGIN)).toBe(
      'https://other.example/a.js:1:2',
    )
    expect(pageUrl(DECK)).toBe('rotapp.cz/balicek?trida=RO1&pocet=20&seed=123&karta=4')
  })

  test('event path: error, source and the full page address', () => {
    expect(
      errorEventPath({
        name: 'TypeError',
        message: 'x is not a function',
        source: '/_next/a.js:1:2',
        url: 'rotapp.cz/balicek?trida=RO1&seed=1',
      }),
    ).toBe(
      'chyba: TypeError: x is not a function (/_next/a.js:1:2) @ rotapp.cz/balicek?trida=RO1&seed=1',
    )
    expect(errorEventPath({ name: 'Error', message: 'm', url: 'rotapp.cz/' })).toBe(
      'chyba: Error: m @ rotapp.cz/',
    )
    const long = errorEventPath({ name: 'Error', message: 'x'.repeat(5000), url: 'rotapp.cz/' })
    expect(long.length).toBeLessThan(400)
  })

  test('sends an event with the deck address, the source from the stack', () => {
    const { hits, report } = setup()
    const error = new TypeError('x is not a function')
    error.stack = `deal@${ORIGIN}/_next/static/chunks/0abc.js:1:2345`
    report(error)
    expect(hits).toEqual([
      {
        path: 'chyba: TypeError: x is not a function (/_next/static/chunks/0abc.js:1:2345) @ rotapp.cz/balicek?trida=RO1&pocet=20&seed=123&karta=4',
        event: true,
      },
    ])
  })

  test('falls back to the source of the error event', () => {
    const { hits, report } = setup()
    report('Script error.', `${ORIGIN}/_next/b.js:7:8`)
    expect(hits[0]!.path).toBe(
      'chyba: Error: Script error. (/_next/b.js:7:8) @ rotapp.cz/balicek?trida=RO1&pocet=20&seed=123&karta=4',
    )
  })

  test('each distinct error once, at most MAX_REPORTS per page load', () => {
    const { hits, report } = setup()
    const same = new Error('same')
    report(same)
    report(same)
    expect(hits).toHaveLength(1)
    for (let i = 0; i < 20; i++) report(new Error(`loop ${i}`))
    expect(hits).toHaveLength(MAX_REPORTS)
  })
})

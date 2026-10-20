/**
 * Error reports (2026-10-20). A script error on someone's phone is otherwise invisible — "on
 * the home screen it opens but then does nothing" could not be reproduced. Every uncaught
 * error and rejected promise goes to GoatCounter (`lib/analytics.ts`) as an event: the
 * error, where in the code it happened and the full address of the page. Decks and courses
 * keep their whole state in the URL, so the address is enough to open the same deck and
 * repeat the error; nothing in it is personal. The browser and system come from the
 * request itself — the GoatCounter dashboard filtered to the event shows them.
 *
 * The listeners are installed when this module loads, before React hydrates, so an error
 * that stops the page from ever becoming interactive is reported too. Next.js passes
 * uncaught render errors to `reportError`, which fires the same `error` event.
 */

import { sendHit, shouldCount, type CountHit } from './analytics'

/** Every error event starts with this, so the dashboard lists them together. */
export const ERROR_EVENT_PREFIX = 'chyba'

/** At most this many reports per page load — an error in a loop must not flood the counter. */
export const MAX_REPORTS = 5

const MAX_MESSAGE = 300
const MAX_URL = 1000

export type ErrorReport = {
  name: string
  message: string
  /** `file:line:column` of the code that threw, origin dropped. */
  source?: string
  /** The page: host, path, query and hash. */
  url: string
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

/** Name and message of whatever was thrown — an Error, a string or anything else. */
export function describeError(thrown: unknown): { name: string; message: string } {
  if (thrown instanceof Error) return { name: thrown.name, message: thrown.message }
  if (typeof thrown === 'string') return { name: 'Error', message: thrown }
  let message: string
  try {
    message = JSON.stringify(thrown) ?? String(thrown)
  } catch {
    message = String(thrown)
  }
  return { name: typeof thrown, message }
}

/** The first `file:line:column` of a stack — Safari's `fn@url:1:2` or Chrome's `at fn (url:1:2)`. */
export function firstStackFrame(stack: string | undefined): string | undefined {
  return stack?.match(/(?:https?:\/\/|\/)[^\s()@]+:\d+:\d+/)?.[0]
}

/** Drops the page's own origin from a script address, keeps foreign ones. */
export const stripOrigin = (source: string, origin: string) =>
  source.startsWith(origin) ? source.slice(origin.length) : source

/** The page address without the scheme: `rotapp.cz/balicek?trida=RO1&seed=…`. */
export const pageUrl = (href: string) => href.replace(/^https?:\/\//, '')

/** The GoatCounter event: `chyba: TypeError: x is not a function (/_next/…:1:2) @ rotapp.cz/…`. */
export function errorEventPath({ name, message, source, url }: ErrorReport): string {
  const where = source ? ` (${source})` : ''
  return `${ERROR_EVENT_PREFIX}: ${name}: ${clip(message, MAX_MESSAGE)}${where} @ ${clip(url, MAX_URL)}`
}

/**
 * Sends each distinct error once per page load, up to `MAX_REPORTS`. Returns the report
 * function; `send` and the page come in as arguments so it is testable without a browser.
 */
export function createErrorReporter({
  send,
  page,
}: {
  send: (hit: CountHit) => void
  page: () => { href: string; origin: string }
}) {
  const seen = new Set<string>()
  return (thrown: unknown, fallbackSource?: string) => {
    if (seen.size >= MAX_REPORTS) return
    const { href, origin } = page()
    const { name, message } = describeError(thrown)
    const frame = firstStackFrame(thrown instanceof Error ? thrown.stack : undefined)
    const source = frame ?? fallbackSource
    const path = errorEventPath({
      name,
      message,
      source: source && stripOrigin(source, origin),
      url: pageUrl(href),
    })
    if (seen.has(path)) return
    seen.add(path)
    send({ path, event: true })
  }
}

let report: ((thrown: unknown, fallbackSource?: string) => void) | null = null

/** Reports an error the app caught itself (e.g. a failed service worker install). */
export function reportIssue(thrown: unknown) {
  report?.(thrown)
}

/**
 * A service worker that fails to install — the precache did not download, storage is full
 * — turns redundant straight from `installing`. The app keeps working online, but never
 * offline, and nothing on the screen says so.
 */
export function watchServiceWorkerInstall(registration: ServiceWorkerRegistration) {
  const watch = (worker: ServiceWorker | null) => {
    if (!worker) return
    let installed = false
    worker.addEventListener('statechange', () => {
      if (worker.state === 'redundant' && !installed) {
        const error = new Error('install failed')
        error.name = 'ServiceWorker'
        reportIssue(error)
      } else if (worker.state !== 'installing') {
        installed = true
      }
    })
  }
  watch(registration.installing)
  registration.addEventListener('updatefound', () => watch(registration.installing))
}

if (
  typeof window !== 'undefined' &&
  shouldCount(window.location.hostname, process.env.NODE_ENV === 'production')
) {
  const reportError = createErrorReporter({
    send: sendHit,
    page: () => ({ href: window.location.href, origin: window.location.origin }),
  })
  report = reportError
  window.addEventListener('error', (e) => {
    const source = e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined
    reportError(e.error ?? e.message, source)
  })
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason))
}

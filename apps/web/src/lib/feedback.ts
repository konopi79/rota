/**
 * Bug reports and ideas (2026-10-21). ROTA has no backend and no mail, so feedback goes to
 * a public Google Form owned by the author: answers land in its sheet and Google mails a
 * notice of each one. The form needs no account. The app opens it with the context already
 * filled in — the page address (a deck's whole state, so the deck can be opened again), the
 * version and the device — and the user writes only what is wrong.
 *
 * The entry ids and the option texts come from the form itself (`FB_PUBLIC_LOAD_DATA_` in
 * the page source of `viewform`). Changing a question in the form editor keeps its id;
 * deleting and re-adding it does not — and an option text here must match the form's
 * exactly, or the choice is silently left empty.
 */

import { pageUrl } from './error-report'

export const FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSevnGm95lLWq_TAPQ2wyGh_unlkQ4DU4e_z5jEzaeWq5_02YA/viewform'

const ENTRY = {
  kind: 'entry.1410061809',
  page: 'entry.1477301897',
  version: 'entry.1316240633',
  device: 'entry.666559346',
} as const

/** The form's answers to "Co hlásíš?" — verbatim. */
export const FEEDBACK_KINDS = {
  card: 'Chyba v kartě nebo pravidlu',
  bug: 'Aplikace nefunguje, jak má',
  idea: 'Nápad na vylepšení',
} as const

export type FeedbackKind = keyof typeof FEEDBACK_KINDS

export type FeedbackContext = {
  kind?: FeedbackKind
  /** The page the user reports from, full `href`. */
  href: string
  /** The last page worth reporting about (`rememberPage`), full `href`. */
  previous?: string
  /** The course being edited, as its course page — the editor keeps it out of its URL. */
  course?: string
  /** Build time, `NEXT_PUBLIC_BUILD_TIME`. */
  version?: string
  device?: string
}

/**
 * "Kde v aplikaci": the page, and the page before it when that is another one — a handler
 * finishes the deck, goes home and reports from there, and the deck is what the report is
 * about.
 */
export function pageField({
  href,
  previous,
  course,
}: Pick<FeedbackContext, 'href' | 'previous' | 'course'>): string {
  const parts = [pageUrl(href)]
  if (previous && previous !== href) parts.push(`předtím: ${pageUrl(previous)}`)
  if (course) parts.push(`parkur: ${pageUrl(course)}`)
  return parts.join(' · ')
}

/** The form's address with the context filled in. */
export function feedbackUrl({ kind, version, device, ...page }: FeedbackContext): string {
  const params = new URLSearchParams({ usp: 'pp_url' })
  if (kind) params.set(ENTRY.kind, FEEDBACK_KINDS[kind])
  params.set(ENTRY.page, pageField(page))
  if (version) params.set(ENTRY.version, version)
  if (device) params.set(ENTRY.device, device)
  return `${FEEDBACK_FORM_URL}?${params}`
}

/**
 * The home page and About say nothing about what went wrong — they are where a report is
 * written from, not about. Every other page is remembered as the last one visited.
 */
const NOT_REMEMBERED = new Set(['/', '/o-aplikaci'])

const LAST_PAGE_KEY = 'rota:lastPage'

/**
 * Remembers the page for the next report, for this tab only (`sessionStorage`: nothing
 * outlives the visit). A deck moving on updates it, so it holds the card reached last.
 */
export function rememberPage(pathname: string, href: string) {
  if (NOT_REMEMBERED.has(pathname)) return
  try {
    globalThis.sessionStorage?.setItem(LAST_PAGE_KEY, href)
  } catch {
    // Storage off (private mode): the report just goes without the previous page.
  }
}

export function lastPage(): string | undefined {
  try {
    return globalThis.sessionStorage?.getItem(LAST_PAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

/**
 * The browser as it describes itself, plus whether ROTA runs from the home screen and the
 * viewport — "the plan is cut off" means little without the screen size. Not parsed into
 * "iPhone, Safari": user agents lie in too many ways, the raw string is easier to read right.
 */
export function describeDevice({
  userAgent,
  installed,
  width,
  height,
}: {
  userAgent: string
  installed: boolean
  width: number
  height: number
}): string {
  return `${userAgent} · ${installed ? 'z plochy' : 'v prohlížeči'} · ${width}×${height}`
}

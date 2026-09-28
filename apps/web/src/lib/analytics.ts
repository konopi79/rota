/**
 * Visit counter (GoatCounter, cookieless — nothing is stored on the device, so no consent
 * banner). Instead of GoatCounter's count.js this sends the documented `/count` request
 * itself: count.js only counts full page loads (ROTA navigates client-side), would record
 * every deck's seed and card position as its own page, and would be third-party code
 * running in the app.
 *
 * What is counted: which page (a deck or course by class only), and once per launch
 * whether the app runs from the home screen. Offline nothing is sent — the request just
 * fails, which is fine.
 */

export const GOATCOUNTER_ENDPOINT = 'https://rotapp.goatcounter.com/count'

/** Launch events: installed (home screen) vs. in a browser tab. */
export const LAUNCH_INSTALLED = 'spusteni-z-plochy'
export const LAUNCH_BROWSER = 'spusteni-v-prohlizeci'

/**
 * The path to count. Decks and courses keep their state in the query string; only the
 * class matters for the statistics (`/balicek/RO1`), not the seed or the card position.
 */
export function analyticsPath(pathname: string, search: string): string {
  if (pathname === '/balicek' || pathname === '/parkur') {
    const cls = new URLSearchParams(search).get('trida')
    return cls ? `${pathname}/${cls}` : pathname
  }
  return pathname
}

export type CountHit = {
  path: string
  /** A named event (e.g. a launch) instead of a page view. */
  event?: boolean
  referrer?: string
  screenWidth?: number
}

/** The GoatCounter `/count` URL for one hit (parameters as documented for its pixel/API). */
export function countUrl(hit: CountHit, endpoint = GOATCOUNTER_ENDPOINT): string {
  const params = new URLSearchParams({ p: hit.path })
  if (hit.event) params.set('e', 'true')
  if (hit.referrer) params.set('r', hit.referrer)
  if (hit.screenWidth) params.set('s', String(hit.screenWidth))
  // Cache-buster, as count.js sends it.
  params.set('rnd', Math.random().toString(36).slice(2, 8))
  return `${endpoint}?${params}`
}

/** Local development and previews are never counted. */
export function shouldCount(hostname: string, production: boolean): boolean {
  return production && hostname !== 'localhost' && !/^(127\.|\[?::1\]?$)/.test(hostname)
}

/** Fire and forget; a failure (offline, blocker) is ignored. */
export function sendHit(hit: CountHit) {
  const url = countUrl(hit)
  try {
    if (navigator.sendBeacon?.(url)) return
  } catch {
    // Fall through to the image request.
  }
  new Image().src = url
}

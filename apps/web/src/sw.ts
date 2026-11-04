/// <reference lib="webworker" />
/**
 * Service worker (plan §8, R5): precaches the whole static site — pages, their RSC
 * payloads, scripts, styles and every card image — so ROTA works on a field without
 * signal. Bundled and given its precache manifest by scripts/build-sw.ts after `next build`.
 *
 * Pages and their RSC payloads come from the network first, the precache only without signal
 * or when the network is slow (`PAGE_TIMEOUT`): served from the precache first, a reload showed
 * the old version until the one after (the author, 2026-11-03), the new one installing in the
 * background meanwhile. Both together, so a page and the data its links load are always of one
 * build — the scripts a new page asks for are not in the old precache, they come from the network.
 */
import { Serwist, type PrecacheEntry } from 'serwist'

import { isCardPage, OFFLINE_CARD_PATH } from './lib/offline-card-path'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[]
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // `/trida/ro1` is served from the precached `trida/ro1.html`.
    cleanURLs: true,
    // The deck lives in the query string (`/balicek?trida=…`) and client navigations add
    // `?_rsc=…`: every query maps onto the same precached file.
    ignoreURLParametersMatching: [/.*/],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
})

/** Waiting longer than this for a page, the precached one is shown instead, ms. */
const PAGE_TIMEOUT = 3000

/** A page loaded, or the RSC payload a client navigation loads (`?_rsc=…`, header `RSC: 1`). */
const isPage = (request: Request) =>
  request.method === 'GET' &&
  (request.mode === 'navigate' ||
    request.headers.get('RSC') === '1' ||
    new URL(request.url).searchParams.has('_rsc'))

const fromNetwork = (request: Request): Promise<Response | undefined> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), PAGE_TIMEOUT)
    fetch(request)
      .then((response) => resolve(response.ok ? response : undefined))
      .catch(() => resolve(undefined))
      .finally(() => clearTimeout(timer))
  })

/**
 * A card's own page is not precached (plan R20): without signal its address gets the one
 * offline card page, which reads the card from the address. Its page data (a client
 * navigation) gets an error, so the router loads the address as a whole page — and so this.
 */
const offlineCard = async (request: Request) =>
  request.mode === 'navigate' && isCardPage(new URL(request.url).pathname)
    ? serwist.matchPrecache(`${OFFLINE_CARD_PATH}.html`)
    : undefined

// Before Serwist's own listener: the first to respond wins.
self.addEventListener('fetch', (event) => {
  if (!isPage(event.request)) return
  event.respondWith(
    (async () =>
      (await fromNetwork(event.request)) ??
      // Without signal, slow, or an error page: the precached one, as before.
      (await serwist.handleRequest({ request: event.request, event })) ??
      (await offlineCard(event.request)) ??
      Response.error())(),
  )
})

serwist.addEventListeners()

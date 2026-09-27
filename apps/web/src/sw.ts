/// <reference lib="webworker" />
/**
 * Service worker (plan §8, R5): precaches the whole static site — pages, their RSC
 * payloads, scripts, styles and every card image — so ROTA works on a field without
 * signal. Bundled and given its precache manifest by scripts/build-sw.ts after `next build`.
 */
import { Serwist, type PrecacheEntry } from 'serwist'

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

serwist.addEventListeners()

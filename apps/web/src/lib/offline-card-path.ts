/**
 * Card details offline from one page (plan R20). Every card has its own prerendered page
 * (`/karta/cz/z-014`) for search engines and the first visit, but they are not precached —
 * 213 of them took 9.3 MB, half the precache. Instead the service worker answers a card page
 * it does not have with one page, which draws the card named in the address from the data
 * the scripts carry anyway (`components/offline-card.tsx`).
 *
 * No card data here: the service worker imports this module.
 */

/** The route parameters of the one offline page. */
export const OFFLINE_CARD = { ruleset: '_', card: '_' } as const

/** Its address; `cleanURLs` finds it as the precached `karta/_/_.html`. */
export const OFFLINE_CARD_PATH = `/karta/${OFFLINE_CARD.ruleset}/${OFFLINE_CARD.card}`

/**
 * A file or address of a card's own page — `karta/cz/z-014.html`, its page data, or
 * `/karta/cz/z-014` — but not the offline page.
 */
export const isCardPage = (path: string) => {
  const relative = path.replace(/^\//, '')
  return relative.startsWith('karta/') && !relative.startsWith('karta/_/')
}

/**
 * Whether a file of the static export goes into the precache (`scripts/build-sw.ts`): all
 * of it but the cards' own pages; the offline page stays.
 */
export const inPrecache = (file: string) => !isCardPage(file)

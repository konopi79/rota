/**
 * A page left behind by an update (2026-10-22). A new version takes over an open app at once
 * (`skipWaiting` + `clientsClaim` in sw.ts) and only reloads it once hidden
 * (`lib/sw-update.ts`). Until then the page on screen still runs the old scripts, while the
 * service worker already serves the new build: a navigation inside the app would load the
 * new build's page data and scripts into the old runtime — on an installed iPhone app,
 * "Sestavit tréninkový parkur" right after a deploy gave a blank screen.
 *
 * So once the page is stale, every navigation loads the whole new page instead: links and
 * `navigate` go to the address, back and forward reload it. The listeners are installed
 * when this module loads, before React hydrates — the popstate one must run before the
 * router's own.
 */

let stale = false

/** The page runs an older version than the service worker now serves. */
export const isStale = () => stale

export function markStale(): void {
  stale = true
}

/** For tests. */
export function resetStale(): void {
  stale = false
}

type LinkClick = {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
  /** The `<a>` clicked (or clicked inside), if any. */
  anchor: { href: string; target: string; hasDownload: boolean } | null
}

/**
 * The address a click should load as a whole page because the page is stale: a plain
 * left click on a link to this site. `undefined` — leave the click alone.
 */
export function staleLinkTarget(click: LinkClick, origin: string): string | undefined {
  if (!stale || click.defaultPrevented || !click.anchor) return undefined
  if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) {
    return undefined
  }
  const { href, target, hasDownload } = click.anchor
  if (hasDownload || (target && target !== '_self')) return undefined
  try {
    return new URL(href).origin === origin ? href : undefined
  } catch {
    return undefined
  }
}

function onClick(event: MouseEvent) {
  const element = event.target instanceof Element ? event.target.closest('a[href]') : null
  const anchor = element instanceof HTMLAnchorElement ? element : null
  const href = staleLinkTarget(
    {
      button: event.button,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      defaultPrevented: event.defaultPrevented,
      anchor: anchor && {
        href: anchor.href,
        target: anchor.target,
        hasDownload: anchor.hasAttribute('download'),
      },
    },
    window.location.origin,
  )
  if (!href) return
  event.preventDefault()
  event.stopPropagation()
  window.location.assign(href)
}

function onPopState(event: PopStateEvent) {
  if (!stale) return
  // The address is already the one gone back to: load it whole, keep the router out.
  event.stopImmediatePropagation()
  window.location.reload()
}

/** Goes to `href` inside the app — or loads it whole when the page is stale. */
export function navigate(push: (href: string) => void, href: string): void {
  if (stale) window.location.assign(href)
  else push(href)
}

if (typeof window !== 'undefined') {
  document.addEventListener('click', onClick, { capture: true })
  window.addEventListener('popstate', onPopState)
}

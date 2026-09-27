/**
 * Keeps an installed app up to date (R5). A home-screen app on iOS is resumed from memory,
 * not reloaded, so the browser's own update check (on navigation) may not run for days:
 * check whenever the app comes back to the screen. A new version activates in the
 * background (`skipWaiting` + `clientsClaim` in sw.ts) while the old page stays on screen,
 * so reload while the app is hidden — phone in the pocket — and the next glance shows the
 * new version. Decks keep their position in the URL, so a reload loses nothing.
 *
 * The browser objects come in as arguments so the logic is testable without one.
 */

type Listenable = {
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

export type UpdateDeps = {
  container: Listenable & { controller: unknown }
  registration: Promise<{ update: () => Promise<unknown> }>
  doc: Listenable & { visibilityState: DocumentVisibilityState }
  reload: () => void
}

/** Starts watching; returns the cleanup. */
export function watchForUpdates({ container, registration, doc, reload }: UpdateDeps) {
  // The first install claims an uncontrolled page — that is not an update.
  let controlled = container.controller !== null && container.controller !== undefined
  let updated = false

  const onControllerChange = () => {
    if (controlled) {
      updated = true
      // Finished installing while the phone was already in the pocket.
      if (doc.visibilityState === 'hidden') reload()
    }
    controlled = true
  }
  const onVisibilityChange = () => {
    if (doc.visibilityState === 'hidden') {
      if (updated) reload()
    } else {
      // Offline on a field → the check fails; the cached version keeps working.
      void registration.then((r) => r.update()).catch(() => {})
    }
  }

  container.addEventListener('controllerchange', onControllerChange)
  doc.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    container.removeEventListener('controllerchange', onControllerChange)
    doc.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

import { describe, expect, test } from 'bun:test'

import { watchForUpdates } from '../sw-update'

/** A fake browser: service worker container, document visibility, update checks, reloads. */
function setup({ controlled }: { controlled: boolean }) {
  const container = Object.assign(new EventTarget(), {
    controller: controlled ? {} : null,
  })
  const doc = Object.assign(new EventTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
  })
  let checks = 0
  let reloads = 0
  let online = true
  const registration = Promise.resolve({
    update: async () => {
      checks++
      if (!online) throw new Error('offline')
    },
  })
  const stop = watchForUpdates({ container, registration, doc, reload: () => reloads++ })
  const flush = () => new Promise((r) => setTimeout(r, 0))
  return {
    stop,
    flush,
    newVersion: () => container.dispatchEvent(new Event('controllerchange')),
    show: () => {
      doc.visibilityState = 'visible'
      doc.dispatchEvent(new Event('visibilitychange'))
    },
    hide: () => {
      doc.visibilityState = 'hidden'
      doc.dispatchEvent(new Event('visibilitychange'))
    },
    goOffline: () => (online = false),
    get checks() {
      return checks
    },
    get reloads() {
      return reloads
    },
  }
}

describe('service worker updates', () => {
  test('checks for a new version whenever the app comes back to the screen', async () => {
    const app = setup({ controlled: true })
    app.show()
    app.hide()
    app.show()
    await app.flush()
    expect(app.checks).toBe(2)
    expect(app.reloads).toBe(0)
  })

  test('a new version is applied when the app is hidden, never in front of the user', () => {
    const app = setup({ controlled: true })
    app.newVersion()
    expect(app.reloads).toBe(0)
    app.hide()
    expect(app.reloads).toBe(1)
  })

  test('a new version that finishes while the phone is in the pocket reloads right away', () => {
    const app = setup({ controlled: true })
    app.hide()
    app.newVersion()
    expect(app.reloads).toBe(1)
  })

  test('the first install is not an update', () => {
    const app = setup({ controlled: false })
    app.newVersion() // clientsClaim of the first install
    app.hide()
    expect(app.reloads).toBe(0)
    app.show()
    app.newVersion() // a real update later in the same session
    app.hide()
    expect(app.reloads).toBe(1)
  })

  test('offline: the failed check is swallowed and nothing reloads', async () => {
    const app = setup({ controlled: true })
    app.goOffline()
    app.show()
    await app.flush()
    expect(app.checks).toBe(1)
    app.hide()
    expect(app.reloads).toBe(0)
  })

  test('cleanup stops watching', () => {
    const app = setup({ controlled: true })
    app.stop()
    app.newVersion()
    app.hide()
    expect(app.reloads).toBe(0)
  })
})

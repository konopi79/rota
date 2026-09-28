/**
 * Install state for the home-screen hint (R5). A tiny external store so components can
 * read it with `useSyncExternalStore`: the `beforeinstallprompt` event (Chrome, Android)
 * fires early and only once, so it is captured here at module load, not in a component.
 */

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'none'

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export function subscribeInstall(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function installMode(): InstallMode {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return 'installed'
  if (deferred) return 'prompt'
  // iOS has no install prompt, but every iOS browser (all are WebKit) can add to the
  // home screen from its share menu since iOS 16.4. iPadOS reports itself as a Mac.
  const ua = navigator.userAgent
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios'
  return 'none'
}

export async function promptInstall() {
  await deferred?.prompt()
  deferred = null
  notify()
}

/**
 * ROTA moved to its own domain on 2026-09-28. The original address keeps serving the app
 * — home-screen apps installed from it would stop updating behind a redirect — but tells
 * its users about the new one. Local storage belongs to one origin and does not move.
 */
export const CANONICAL_URL = 'https://rotapp.cz'
const OLD_HOSTS = ['rota.rock8cloud.app']

export const isOldHost = (hostname: string) => OLD_HOSTS.includes(hostname)

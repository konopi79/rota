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
  // iOS has no install prompt; only Safari can add to the home screen.
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return 'ios'
  return 'none'
}

export async function promptInstall() {
  await deferred?.prompt()
  deferred = null
  notify()
}

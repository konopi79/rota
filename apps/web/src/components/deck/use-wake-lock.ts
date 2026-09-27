import { useEffect } from 'react'

/**
 * Keep the screen on while a deck is open (plan D7): the phone goes into a pocket between
 * cards and must not be locked when it comes out. The browser drops the lock whenever the
 * page is hidden, so it is re-requested on every return. Unsupported → silently nothing.
 */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    let cancelled = false
    const request = async () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) void next.release()
        else lock = next
      } catch {
        // Denied (battery saver, iframe) — the deck still works.
      }
    }
    void request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [])
}

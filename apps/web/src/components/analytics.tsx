'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import {
  analyticsPath,
  LAUNCH_BROWSER,
  LAUNCH_INSTALLED,
  sendHit,
  shouldCount,
} from '@/lib/analytics'

/** Counts page views and app launches (`lib/analytics.ts`); renders nothing. */
export function Analytics() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    if (!shouldCount(window.location.hostname, process.env.NODE_ENV === 'production')) return
    const isFirst = first.current
    first.current = false
    if (isFirst) {
      const installed =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
      sendHit({ path: installed ? LAUNCH_INSTALLED : LAUNCH_BROWSER, event: true })
    }
    sendHit({
      path: analyticsPath(pathname, window.location.search),
      // Where people come from — only meaningful on the first page of a visit.
      referrer: isFirst ? document.referrer : undefined,
      screenWidth: window.screen.width,
    })
  }, [pathname])

  return null
}

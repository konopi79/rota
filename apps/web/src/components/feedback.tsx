'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import {
  describeDevice,
  FEEDBACK_FORM_URL,
  feedbackUrl,
  lastPage,
  rememberPage,
  type FeedbackKind,
} from '@/lib/feedback'
import { runsInstalled } from '@/lib/install'

/**
 * Opens the feedback form (`lib/feedback.ts`) in a new tab, so a deck stays where it was.
 * The context is read at the click — the page address changes as a deck moves on — and
 * written into the link just before the browser follows it; without script, or copied by
 * a long press, the link opens the empty form.
 */
export function FeedbackLink({
  kind,
  course,
  ...props
}: {
  kind?: FeedbackKind
  /** The course being edited, as its course page address. */
  course?: () => string | undefined
} & Omit<React.ComponentProps<'a'>, 'href' | 'onClick'>) {
  const fill = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.href = feedbackUrl({
      kind,
      href: window.location.href,
      previous: lastPage(),
      course: course?.(),
      version: process.env.NEXT_PUBLIC_BUILD_TIME,
      device: describeDevice({
        userAgent: navigator.userAgent,
        installed: runsInstalled(),
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    })
  }
  return (
    <a
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={fill}
      {...props}
    />
  )
}

/**
 * Keeps the last visited page for the next report (`rememberPage`); renders nothing. The
 * search params count too: a deck moves on with `history.replaceState`, which Next.js
 * passes to `useSearchParams`. Needs a `<Suspense>` boundary (static export).
 */
export function RememberPage() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  useEffect(() => rememberPage(pathname, window.location.href), [pathname, search])
  return null
}

'use client'

import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { CardDetail } from '@/components/card-detail'
import { cardFromPath } from '@/lib/offline-card'

const noSubscription = () => () => {}

/**
 * The one card page the service worker serves offline (plan R20): the card comes from the
 * address. Prerendered empty — the address is only known in the browser — so the first
 * render matches the HTML and the card follows straight after.
 */
export function OfflineCard() {
  const { t } = useTranslation()
  const pathname = useSyncExternalStore(
    noSubscription,
    () => window.location.pathname,
    () => null,
  )
  if (pathname === null) return <main className="flex-1" />
  const card = cardFromPath(pathname)
  if (!card) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-6">
        <p className="text-muted-foreground">{t('card.notFound')}</p>
      </main>
    )
  }
  return <CardDetail key={card.image} card={card} />
}

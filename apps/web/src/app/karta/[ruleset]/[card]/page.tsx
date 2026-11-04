import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CardDetail } from '@/components/card-detail'
import { OfflineCard } from '@/components/offline-card'
import { CARD_PAGES, OFFLINE_CARD } from '@/lib/offline-card'

export const dynamicParams = false

export function generateStaticParams() {
  return [
    ...Object.entries(CARD_PAGES).flatMap(([ruleset, cards]) =>
      cards.map((card) => ({ ruleset, card: card.image })),
    ),
    // The page the service worker serves offline for any card (plan R20).
    OFFLINE_CARD,
  ]
}

const isOffline = (ruleset: string, card: string) =>
  ruleset === OFFLINE_CARD.ruleset && card === OFFLINE_CARD.card

export async function generateMetadata({
  params,
}: PageProps<'/karta/[ruleset]/[card]'>): Promise<Metadata> {
  const { ruleset, card } = await params
  return isOffline(ruleset, card) ? { robots: { index: false, follow: false } } : {}
}

export default async function CardPage({ params }: PageProps<'/karta/[ruleset]/[card]'>) {
  const { ruleset, card: slug } = await params
  if (isOffline(ruleset, slug)) return <OfflineCard />
  const card = CARD_PAGES[ruleset]?.find((c) => c.image === slug)
  if (!card) notFound()
  return <CardDetail card={card} />
}

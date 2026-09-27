import { CZ_CARDS, FCI_CARDS } from '@rota/content'
import { notFound } from 'next/navigation'

import { CardDetail } from '@/components/card-detail'

const RULESETS = { cz: CZ_CARDS, fci: FCI_CARDS }

export const dynamicParams = false

export function generateStaticParams() {
  return Object.entries(RULESETS).flatMap(([ruleset, cards]) =>
    cards.map((card) => ({ ruleset, card: card.image })),
  )
}

export default async function CardPage({ params }: PageProps<'/karta/[ruleset]/[card]'>) {
  const { ruleset, card: slug } = await params
  const card = RULESETS[ruleset as keyof typeof RULESETS]?.find((c) => c.image === slug)
  if (!card) notFound()
  return <CardDetail card={card} />
}

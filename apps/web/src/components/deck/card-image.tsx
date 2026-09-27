import type { Card } from '@rota/content'
import Image from 'next/image'

import { cn } from '@/lib/utils'

export const cardImageUrl = (card: Card, size: 'full' | 'thumb' = 'full') =>
  `/cards/${card.ruleset.toLowerCase()}/${size === 'thumb' ? 'thumb/' : ''}${card.image}.webp`

/** A card scaled to fit its box without cropping. The box must have a size. */
export function CardImage({ card, className }: { card: Card; className?: string }) {
  return (
    <div className={cn('relative min-h-0 min-w-0', className)}>
      <Image
        src={cardImageUrl(card)}
        alt={`${card.code} ${card.name}`}
        fill
        sizes="100vw"
        priority
        draggable={false}
        className="object-contain drop-shadow-sm select-none"
      />
    </div>
  )
}

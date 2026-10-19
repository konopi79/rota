'use client'

import type { Card } from '@rota/content'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * A national card's "Dílčí část / Hlavní cvik" table (příloha 1): every part marked main or
 * minor, and what that means for the score — a missing main part costs 10 points, a minor
 * one 5 (Směrnice pro posuzování 2025, §3.3–3.4), a repeat 5 (řád, p. 16). So a repeat
 * only pays off for a main part. Some cards have no part marked in the regulation.
 */
export function SubParts({ card, legend = true }: { card: Card; legend?: boolean }) {
  const { t } = useTranslation()
  if (!card.subParts?.length) return null
  const marked = card.subParts.some((p) => p.main)
  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-md border">
        {card.subParts.map((part, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className={cn(part.main && 'font-semibold')}>{part.text}</span>
            {marked && (
              <Badge variant={part.main ? 'default' : 'outline'} className="shrink-0">
                {t(part.main ? 'card.mainPart' : 'card.minorPart')}
              </Badge>
            )}
          </li>
        ))}
      </ul>
      {legend && (
        <p className="text-muted-foreground text-xs">
          {t(marked ? 'card.partsLegend' : 'card.noMainPart')}
        </p>
      )}
    </div>
  )
}

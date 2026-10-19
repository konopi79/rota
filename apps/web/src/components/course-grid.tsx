'use client'

import type { Card, DeckEntry } from '@rota/content'
import { Shuffle, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cardImageUrl } from '@/components/deck/card-image'
import { useWakeLock } from '@/components/deck/use-wake-lock'
import { Button } from '@/components/ui/button'
import { fitGrid } from '@/lib/grid'

const ASPECT = 400 / 283
const GAP = 6

/**
 * The whole course on one screen, cards as big as the screen allows (user request,
 * 2026-10-19): the phone stands on the field a few metres away and is never scrolled.
 * Start and finish are left out — the numbers say where the course begins and ends.
 */
export function CourseGrid({
  title,
  entries,
  card,
  onNew,
  onClose,
}: {
  title: string
  entries: DeckEntry[]
  card: (code: string) => Card
  /** A new dealt course; a hand-made course has none. */
  onNew?: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  useWakeLock()
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number }>()

  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const grid = size && fitGrid({ count: entries.length, ...size, aspect: ASPECT, gap: GAP })
  // Thumbs are 400 px wide; bigger cells (tablets, landscape) get the full image.
  const imageSize =
    grid && grid.itemWidth * window.devicePixelRatio > 400 ? ('full' as const) : ('thumb' as const)

  return (
    <div className="bg-background fixed inset-0 z-50 flex touch-none flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center gap-1 px-2 pt-[max(env(safe-area-inset-top),0.25rem)]">
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">{title}</h2>
        {onNew && (
          <Button variant="ghost" size="icon-lg" aria-label={t('course.new')} onClick={onNew}>
            <Shuffle />
          </Button>
        )}
        <Button variant="ghost" size="icon-lg" aria-label={t('course.closeGrid')} onClick={onClose}>
          <X />
        </Button>
      </header>
      <div ref={box} className="m-1.5 min-h-0 flex-1">
        {grid && (
          <ol
            className="grid h-full content-center justify-center"
            style={{
              gridTemplateColumns: `repeat(${grid.columns}, ${grid.itemWidth}px)`,
              gap: GAP,
            }}
          >
            {entries.map((entry, i) => (
              <Cell
                key={`${i}-${entry.code}`}
                number={i + 1}
                entry={entry}
                card={card(entry.code)}
                sideChanged={i > 0 && entries[i - 1]?.side !== entry.side}
                imageSize={imageSize}
                fontSize={Math.max(11, Math.round(grid.itemWidth * 0.09))}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function Cell({
  number,
  entry,
  card,
  sideChanged,
  imageSize,
  fontSize,
}: {
  number: number
  entry: DeckEntry
  card: Card
  sideChanged: boolean
  imageSize: 'full' | 'thumb'
  fontSize: number
}) {
  const { t } = useTranslation()
  const notes = [
    entry.supplementary && `+ ${entry.supplementary}`,
    entry.pace === 'slow' && t('deck.paceSlow'),
    entry.pace === 'fast' && t('deck.paceFast'),
    (sideChanged || entry.side === 'right') &&
      t(entry.side === 'right' ? 'course.dogRight' : 'course.dogLeft'),
  ].filter(Boolean)
  return (
    <li className="relative" style={{ fontSize }}>
      <Image
        src={cardImageUrl(card, imageSize)}
        alt={`${card.code} ${card.name}`}
        width={400}
        height={283}
        loading="eager"
        draggable={false}
        className="h-auto w-full rounded-sm border bg-white select-none"
      />
      <span className="bg-foreground text-background absolute top-0.5 left-0.5 flex min-w-[1.6em] items-center justify-center rounded-full px-[0.3em] leading-[1.6em] font-bold tabular-nums">
        {number}
      </span>
      {/* Over the printed code, which is too small to read here anyway; the name stays visible. */}
      {notes.length > 0 && (
        <span className="bg-secondary text-secondary-foreground absolute top-0.5 right-0.5 max-w-[calc(100%-2.5em)] truncate rounded-sm px-[0.3em] text-[0.8em] leading-tight font-medium">
          {notes.join(' · ')}
        </span>
      )}
    </li>
  )
}

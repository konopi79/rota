'use client'

import {
  dealDeck,
  getCard,
  getClass,
  randomSeed,
  type Card,
  type DeckEntry,
  type RoClass,
} from '@rota/content'
import { ChevronLeft, ChevronRight, Settings2, Shuffle, X } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { classSlug } from '@/lib/classes'
import { decodeDeckParams, encodeDeckParams, type DeckParams } from '@/lib/deck-url'

import { CardImage, cardImageUrl } from './card-image'
import { useWakeLock } from './use-wake-lock'

const SWIPE_PX = 50

export function DeckView() {
  const search = useSearchParams()
  const params = useMemo(() => decodeDeckParams(new URLSearchParams(search.toString())), [search])
  const cls = params ? getClass(params.options.classId) : undefined
  if (!params || !cls) return <InvalidDeck />
  return <Deck params={params} cls={cls} />
}

function Deck({ params, cls }: { params: DeckParams; cls: RoClass }) {
  const { t } = useTranslation()
  useWakeLock()

  const optionsKey = JSON.stringify(params.options)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when the options change, not the position
  const deck = useMemo(() => dealDeck(params.options), [optionsKey])
  const total = deck.entries.length
  const position = Math.min(params.position, total + 1)
  const entry = position >= 1 && position <= total ? deck.entries[position - 1] : undefined

  // Position changes replace the URL instead of pushing: the back button should leave the
  // deck, not step through every card of it.
  const navigate = useCallback(
    (next: DeckParams) => window.history.replaceState(null, '', `?${encodeDeckParams(next)}`),
    [],
  )
  const go = useCallback(
    (to: number) => navigate({ ...params, position: Math.max(0, Math.min(total + 1, to)) }),
    [navigate, params, total],
  )
  const next = useCallback(() => go(position + 1), [go, position])
  const prev = useCallback(() => go(position - 1), [go, position])
  const reshuffle = () =>
    navigate({ ...params, options: { ...params.options, seed: randomSeed() }, position: 0 })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next()
      else if (e.key === 'ArrowLeft') prev()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  // Warm the cache for the next screen so the card is there the moment it is needed.
  useEffect(() => {
    const upcoming = deck.entries[position]
    if (!upcoming) return
    for (const code of [upcoming.code, upcoming.supplementary]) {
      const card = code ? getCard(cls.ruleset, code) : undefined
      if (card) new Image().src = cardImageUrl(card)
    }
  }, [deck, position, cls.ruleset])

  const pointer = useRef<{ x: number; y: number } | null>(null)
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointer.current
    pointer.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next()
      else prev()
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const rect = e.currentTarget.getBoundingClientRect()
      if (e.clientX - rect.left < rect.width / 3) prev()
      else next()
    }
  }

  const setupHref = `/trida/${classSlug(cls.id)}`
  const side = entry?.side ?? params.options.startSide

  return (
    <div className="bg-background flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center gap-2 px-3 pt-3">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t('deck.close')}
          render={<Link href={setupHref} />}
        >
          <X />
        </Button>
        {entry && (
          <span className="text-lg font-semibold tabular-nums">
            {t('deck.progress', { current: position, total })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {entry?.pace === 'slow' && <Badge variant="secondary">{t('deck.paceSlow')}</Badge>}
          {entry?.pace === 'fast' && <Badge variant="secondary">{t('deck.paceFast')}</Badge>}
          {position <= total && (
            <Badge variant={side === 'right' ? 'default' : 'outline'}>
              {t(side === 'right' ? 'deck.dogRight' : 'deck.dogLeft')}
            </Badge>
          )}
        </div>
      </header>

      <div
        className="flex min-h-0 flex-1 cursor-pointer touch-none flex-col items-center justify-center gap-3 p-3"
        onPointerDown={(e) => (pointer.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={onPointerUp}
      >
        {position === 0 && <StartScreen cls={cls} params={params} dealt={total} />}
        {entry && <EntryCards cls={cls} entry={entry} />}
        {position > total && <FinishScreen cls={cls} count={total} />}
      </div>

      {entry && params.showDescription && <Description cls={cls} entry={entry} />}

      <footer className="grid grid-cols-[1fr_auto_1fr] gap-2 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <Button
          variant="outline"
          className="h-14 text-base"
          disabled={position === 0}
          onClick={prev}
        >
          <ChevronLeft />
          {t('deck.previous')}
        </Button>
        {position > total ? (
          <Button
            variant="ghost"
            className="h-14"
            aria-label={t('deck.changeSetup')}
            render={<Link href={setupHref} />}
          >
            <Settings2 />
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="h-14"
            aria-label={t('deck.reshuffle')}
            onClick={reshuffle}
          >
            <Shuffle />
          </Button>
        )}
        {position > total ? (
          <Button className="h-14 text-base" onClick={reshuffle}>
            <Shuffle />
            {t('deck.reshuffle')}
          </Button>
        ) : (
          <Button className="h-14 text-base" onClick={next}>
            {t('deck.next')}
            <ChevronRight />
          </Button>
        )}
      </footer>
    </div>
  )
}

function EntryCards({ cls, entry }: { cls: RoClass; entry: DeckEntry }) {
  const card = requireCard(cls, entry.code)
  const supplementary = entry.supplementary ? requireCard(cls, entry.supplementary) : undefined
  if (!supplementary) return <CardImage card={card} className="h-full w-full" />
  // On a course the D0 card sits right next to or under the main card; same here.
  return (
    <div className="flex h-full w-full flex-col gap-3 landscape:flex-row">
      <CardImage card={card} className="flex-[3]" />
      <CardImage card={supplementary} className="flex-[2]" />
    </div>
  )
}

function StartScreen({ cls, params, dealt }: { cls: RoClass; params: DeckParams; dealt: number }) {
  const { t } = useTranslation()
  const start = getCard(cls.ruleset, 'START')
  return (
    <>
      {start && <CardImage card={start} className="w-full flex-1" />}
      <div className="space-y-1 text-center">
        {params.options.startSide === 'right' && (
          <p className="font-medium">{t('deck.startRight')}</p>
        )}
        {dealt < params.options.count && (
          <p className="text-destructive text-sm">
            {t('deck.shortDeck', { dealt, requested: params.options.count })}
          </p>
        )}
        <p className="text-muted-foreground text-sm">{t('deck.startHint')}</p>
      </div>
    </>
  )
}

function FinishScreen({ cls, count }: { cls: RoClass; count: number }) {
  const { t } = useTranslation()
  const finish = getCard(cls.ruleset, 'FINISH')
  return (
    <>
      {finish && <CardImage card={finish} className="w-full flex-1" />}
      <p className="text-center font-medium">{t('deck.finished', { count })}</p>
    </>
  )
}

function Description({ cls, entry }: { cls: RoClass; entry: DeckEntry }) {
  const { t } = useTranslation()
  const card = requireCard(cls, entry.code)
  const supplementary = entry.supplementary ? requireCard(cls, entry.supplementary) : undefined
  return (
    <section className="max-h-[35dvh] space-y-2 overflow-y-auto border-t px-4 py-3 text-sm">
      <h2 className="font-semibold">
        {card.code} · {card.name}
      </h2>
      {card.points && (
        <p className="text-muted-foreground">
          {card.nameEn} · {t('deck.points', { count: card.points })}
        </p>
      )}
      {card.description.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {supplementary && (
        <p className="text-muted-foreground">
          {t('deck.supplementary')} {supplementary.code}: {supplementary.name}
        </p>
      )}
    </section>
  )
}

function InvalidDeck() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p>{t('deck.invalid')}</p>
      <Button render={<Link href="/" />}>{t('deck.backHome')}</Button>
    </main>
  )
}

const requireCard = (cls: RoClass, code: string): Card => {
  const card = getCard(cls.ruleset, code)
  if (!card) throw new Error(`Unknown card ${code}`)
  return card
}

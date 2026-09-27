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
import { ChevronLeft, Footprints, Printer, Share2, Shuffle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cardImageUrl } from '@/components/deck/card-image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cardHref, classSlug } from '@/lib/classes'
import { decodeDeckParams, encodeDeckParams, type DeckParams } from '@/lib/deck-url'

/** Competition course (R7): the whole course as a numbered, printable list. */
export function CourseView() {
  const search = useSearchParams()
  const params = useMemo(() => decodeDeckParams(new URLSearchParams(search.toString())), [search])
  const cls = params ? getClass(params.options.classId) : undefined
  if (!params || !cls) return null
  return <Course params={params} cls={cls} />
}

function Course({ params, cls }: { params: DeckParams; cls: RoClass }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const optionsKey = JSON.stringify(params.options)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when the options change
  const deck = useMemo(() => dealDeck(params.options), [optionsKey])
  const card = (code: string) => getCard(cls.ruleset, code) as Card

  const byPoints = new Map<number, number>()
  for (const entry of deck.entries) {
    const points = card(entry.code).points
    if (points) byPoints.set(points, (byPoints.get(points) ?? 0) + 1)
  }
  const totalPoints = [...byPoints].reduce((sum, [points, n]) => sum + points * n, 0)

  const newCourse = () =>
    window.history.replaceState(
      null,
      '',
      `?${encodeDeckParams({ ...params, options: { ...params.options, seed: randomSeed() } })}`,
    )
  const share = async () => {
    const url = window.location.href
    const title = t('course.shareTitle', { cls: t(`classes.${cls.id}`) })
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }
  const deckHref = `/balicek?${encodeDeckParams({ ...params, position: 0 })}`
  const side = (s: 'left' | 'right') => t(s === 'right' ? 'course.right' : 'course.left')

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 print:max-w-none print:py-0">
      <header className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 print:hidden"
          render={<Link href={`/trida/${classSlug(cls.id)}`} />}
        >
          <ChevronLeft />
          {t('course.back')}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('course.title', { cls: t(`classes.${cls.id}`) })}
        </h1>
        <p className="text-muted-foreground">
          {t('course.summary', {
            count: deck.entries.length,
            side: side(params.options.startSide),
          })}
        </p>
        {totalPoints > 0 && (
          <p className="text-muted-foreground text-sm">
            {[...byPoints]
              .sort(([a], [b]) => b - a)
              .map(([points, count]) => t('course.pointsGroup', { points, count }))
              .join(' · ')}{' '}
            · {t('course.pointsTotal', { total: totalPoints })}
          </p>
        )}
      </header>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button onClick={newCourse}>
          <Shuffle />
          {t('course.new')}
        </Button>
        <Button variant="outline" render={<Link href={deckHref} />}>
          <Footprints />
          {t('course.walk')}
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          {t('course.print')}
        </Button>
        <Button variant="outline" onClick={() => void share()}>
          <Share2 />
          {copied ? t('course.copied') : t('course.share')}
        </Button>
      </div>

      <ol className="divide-y rounded-lg border">
        <Row label={t('course.start')} card={card('START')} />
        {deck.entries.map((entry, i) => (
          <CourseRow
            key={`${i}-${entry.code}`}
            number={i + 1}
            entry={entry}
            card={card(entry.code)}
            supplementary={entry.supplementary ? card(entry.supplementary) : undefined}
            sideChanged={i > 0 && deck.entries[i - 1]?.side !== entry.side}
          />
        ))}
        <Row label={t('course.finish')} card={card('FINISH')} />
      </ol>
    </main>
  )
}

function Row({ label, card }: { label: string; card: Card }) {
  return (
    <li className="flex break-inside-avoid items-center gap-3 p-2">
      <span className="w-8 text-center font-semibold" />
      <Thumb card={card} />
      <span className="font-semibold">{label}</span>
    </li>
  )
}

function CourseRow({
  number,
  entry,
  card,
  supplementary,
  sideChanged,
}: {
  number: number
  entry: DeckEntry
  card: Card
  supplementary?: Card
  sideChanged: boolean
}) {
  const { t } = useTranslation()
  return (
    <li className="flex break-inside-avoid items-center gap-3 p-2">
      <span className="w-8 text-center text-lg font-bold tabular-nums">{number}</span>
      <Thumb card={card} />
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <Link href={cardHref(card)} className="block leading-tight hover:underline">
          <span className="font-semibold">{card.code}</span> {card.name}
          {card.points && (
            <span className="text-muted-foreground">
              {' '}
              · {t('deck.points', { count: card.points })}
            </span>
          )}
        </Link>
        {supplementary && (
          <p className="text-muted-foreground leading-tight">
            + {supplementary.code} {supplementary.name}
          </p>
        )}
        {(entry.pace !== 'normal' || sideChanged || entry.side === 'right') && (
          <div className="flex flex-wrap gap-1">
            {entry.pace === 'slow' && <Badge variant="secondary">{t('deck.paceSlow')}</Badge>}
            {entry.pace === 'fast' && <Badge variant="secondary">{t('deck.paceFast')}</Badge>}
            {(sideChanged || entry.side === 'right') && (
              <Badge variant={entry.side === 'right' ? 'default' : 'outline'}>
                {t(entry.side === 'right' ? 'course.dogRight' : 'course.dogLeft')}
              </Badge>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function Thumb({ card }: { card: Card }) {
  return (
    <Image
      src={cardImageUrl(card, 'thumb')}
      alt=""
      width={400}
      height={283}
      className="h-auto w-20 shrink-0 rounded-sm border sm:w-24"
    />
  )
}

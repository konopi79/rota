'use client'

import { CZ_RULESET, FCI_RULESET, type Card } from '@rota/content'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { cardImageUrl } from '@/components/deck/card-image'
import { FeedbackLink } from '@/components/feedback'
import { Badge } from '@/components/ui/badge'
import { SubParts } from '@/components/sub-parts'
import { Button } from '@/components/ui/button'
import { catalogueFromQuery, classesWith, sequencingNotes } from '@/lib/catalogue'
import { cardHref, classSlug } from '@/lib/classes'

const RULESETS = { CZ: CZ_RULESET, FCI: FCI_RULESET }

export function CardDetail({ card }: { card: Card }) {
  const { t } = useTranslation()
  const router = useRouter()
  const notes = sequencingNotes(card)
  const equipment = card.sequencing.equipment ?? []
  const classes = classesWith(card)

  // Reached from a class catalogue (or a shared link): go back where the user came from.
  const back = () => (window.history.length > 1 ? router.back() : router.push('/'))

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={back}>
        <ChevronLeft />
        {t('card.back')}
      </Button>

      <Image
        src={cardImageUrl(card)}
        alt={`${card.code} ${card.name}`}
        width={1600}
        height={1131}
        priority
        className="h-auto w-full rounded-md border"
      />

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {card.code} · {card.name}
        </h1>
        {card.nameEn && (
          <p className="text-muted-foreground">
            {card.nameEn}
            {card.points && ` · ${t('deck.points', { count: card.points })}`}
          </p>
        )}
        {card.exerciseType && (
          <p className="text-muted-foreground text-sm">{t(`card.type${card.exerciseType}`)}</p>
        )}
        {card.placement && card.kind === 'exercise' && (
          <p className="text-muted-foreground text-sm">{t(`card.placement${card.placement}`)}</p>
        )}
      </header>

      <section className="space-y-2">
        {card.description.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      {card.diagram && (
        <section className="space-y-2">
          <h2 className="font-semibold">{t('card.diagram')}</h2>
          <Image
            src={`/cards/${card.ruleset.toLowerCase()}/${card.diagram}.webp`}
            alt={t('card.diagram')}
            width={1600}
            height={1131}
            className="h-auto w-full rounded-md border"
          />
        </section>
      )}

      {card.subParts && (
        <section className="space-y-2">
          <h2 className="font-semibold">{t('card.subParts')}</h2>
          <div className="text-sm">
            <SubParts card={card} />
          </div>
        </section>
      )}

      {(notes.length > 0 || equipment.length > 0) && (
        <section className="space-y-2">
          <h2 className="font-semibold">{t('card.rules')}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {notes.map((note) => (
              <li key={note.key + JSON.stringify(note.values)}>{t(note.key, note.values)}</li>
            ))}
            {equipment.length > 0 && (
              <li>
                {t('card.equipment')}: {equipment.map((e) => t(`equipment.${e}`)).join(', ')}
              </li>
            )}
          </ul>
        </section>
      )}

      {classes.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">{t('card.classes')}</h2>
          <div className="flex flex-wrap gap-2">
            {classes.map((cls) => (
              <Badge
                key={cls.id}
                variant="outline"
                render={<Link href={`/trida/${classSlug(cls.id)}/karty`} />}
              >
                {t(`classes.${cls.id}`)}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <p className="text-muted-foreground text-xs">
        {t('card.source', { source: RULESETS[card.ruleset].source, page: card.sourcePage })}
      </p>
      <FeedbackLink kind="card" className="self-start text-sm underline underline-offset-4">
        {t('feedback.card')}
      </FeedbackLink>

      {/* The catalogue list comes from search params, readable only in the browser. */}
      <Suspense>
        <CataloguePager card={card} />
      </Suspense>
    </main>
  )
}

/**
 * Previous / next card of the catalogue list the detail was opened from, without going
 * back to it. Steps replace the history entry, so "Zpět" still returns to the catalogue.
 */
function CataloguePager({ card }: { card: Card }) {
  const { t } = useTranslation()
  const search = useSearchParams()
  const cards = catalogueFromQuery(search)
  const index = cards?.findIndex((c) => c.code === card.code) ?? -1
  if (!cards || index < 0) return null

  const query = search.toString()
  const link = (c: Card | undefined) => c && <Link replace href={`${cardHref(c)}?${query}`} />
  const prev = cards[index - 1]
  const next = cards[index + 1]

  return (
    <nav className="bg-background sticky bottom-0 -mx-4 mt-auto -mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <Button variant="outline" className="h-12 text-base" disabled={!prev} render={link(prev)}>
        <ChevronLeft />
        {t('deck.previous')}
      </Button>
      <span className="text-muted-foreground text-sm tabular-nums">
        {t('deck.progress', { current: index + 1, total: cards.length })}
      </span>
      <Button variant="outline" className="h-12 text-base" disabled={!next} render={link(next)}>
        {t('deck.next')}
        <ChevronRight />
      </Button>
    </nav>
  )
}

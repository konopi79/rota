'use client'

import { getClass, type ClassId } from '@rota/content'
import { ChevronLeft, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cardImageUrl } from '@/components/deck/card-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  catalogueCards,
  catalogueQuery,
  filterCards,
  filtersFromParams,
  filtersToParams,
  type CatalogueFilters,
} from '@/lib/catalogue'
import { cardHref, classSlug } from '@/lib/classes'

/** The catalogue with the filters of its URL; needs a Suspense boundary (static export). */
export function CatalogueFromUrl({ classId }: { classId: ClassId }) {
  // Read once: later changes come from the catalogue itself, which keeps the URL in sync.
  const search = useSearchParams()
  return <Catalogue classId={classId} initialFilters={filtersFromParams(search)} />
}

export function Catalogue({
  classId,
  initialFilters,
}: {
  classId: ClassId
  initialFilters: CatalogueFilters
}) {
  const { t } = useTranslation()
  const cls = getClass(classId)
  if (!cls) throw new Error(`No content for ${classId}`)

  const [filters, setFilters] = useState(initialFilters)
  // The filters live in the URL too (replaced, not pushed), so "Zpět" from a card detail
  // comes back to the same list.
  const update = (patch: Partial<CatalogueFilters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    const query = filtersToParams(next).toString()
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
  }
  const all = useMemo(() => catalogueCards(cls), [cls])
  const cards = filterCards(cls, all, filters)

  const hasNew = cls.newCardCodes.length > 0 && cls.newCardCodes.length < cls.cardCodes.length
  const groups: { value: string; label: string }[] =
    cls.ruleset === 'FCI'
      ? [1, 2, 3, 4].map((n) => ({ value: String(n), label: t('catalogue.points', { count: n }) }))
      : [
          { value: 'A', label: t('catalogue.typeA') },
          { value: 'B', label: t('catalogue.typeB') },
          { value: 'AB', label: t('catalogue.typeAB') },
          { value: 'D0', label: t('catalogue.supplementary') },
        ]

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
      <header className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href={`/trida/${classSlug(classId)}`} />}
        >
          <ChevronLeft />
          {t('catalogue.back')}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('catalogue.title', { cls: t(`classes.${classId}`) })}
        </h1>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            className="h-11 pl-9 text-base"
            placeholder={t('catalogue.search')}
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            variant="outline"
            value={[filters.group || 'all']}
            onValueChange={(v) => update({ group: !v[0] || v[0] === 'all' ? '' : v[0] })}
            className="flex-wrap"
          >
            <ToggleGroupItem value="all">{t('catalogue.all')}</ToggleGroupItem>
            {groups.map((g) => (
              <ToggleGroupItem key={g.value} value={g.value}>
                {g.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {hasNew && (
            <Toggle
              variant="outline"
              pressed={filters.newOnly}
              onPressedChange={(pressed) => update({ newOnly: pressed })}
            >
              {t('catalogue.newOnly')}
            </Toggle>
          )}
          <Toggle
            variant="outline"
            pressed={filters.equipment !== null}
            onPressedChange={(pressed) => update({ equipment: pressed ? [] : null })}
          >
            {t('catalogue.noEquipment')}
          </Toggle>
        </div>
        <p className="text-muted-foreground text-sm">
          {t('catalogue.count', { count: cards.length })}
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">{t('catalogue.empty')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <li key={card.code}>
              <Link
                href={`${cardHref(card)}?${catalogueQuery(classId, filters)}`}
                className="hover:bg-muted block space-y-1.5 rounded-lg border p-2 transition-colors"
              >
                <Image
                  src={cardImageUrl(card, 'thumb')}
                  alt=""
                  width={400}
                  height={283}
                  className="h-auto w-full"
                />
                <p className="text-sm leading-tight">
                  <span className="font-semibold">{card.code}</span> {card.name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

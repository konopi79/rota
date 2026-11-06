'use client'

import { getClass, type ClassId } from '@rota/content'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { FeedbackLink } from '@/components/feedback'
import { InstallHint, MovedHint } from '@/components/pwa'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { classSlug, internationalClassIds, nationalClassIds } from '@/lib/classes'
import {
  loadRegulation,
  saveRegulation,
  subscribeStorage,
  type NationalRegulation,
} from '@/lib/storage'

function ClassButton({ id }: { id: ClassId }) {
  const { t } = useTranslation()
  const cls = getClass(id)
  const label = t(`classes.${id}`)
  if (!cls) {
    return (
      <Button variant="outline" disabled className="h-14 justify-between text-base">
        {label}
        <span className="text-muted-foreground text-xs">{t('home.comingSoon')}</span>
      </Button>
    )
  }
  return (
    <Button
      variant="outline"
      className="h-14 justify-between text-base"
      render={<Link href={`/trida/${classSlug(id)}`} />}
    >
      {label}
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        {t('home.cardCount', { count: cls.cardCodes.length })}
        <ChevronRight className="size-4" />
      </span>
    </Button>
  )
}

/**
 * The classes first — training matters more than installing (the author, 2026-11-06): the national
 * regulation and its classes (most visits), then FCI-ROB under a heading of its own, so it does
 * not look changed by the national switch; the install hint below them.
 */
export default function HomePage() {
  const { t } = useTranslation()
  // The static HTML lists the 2026 classes; in the browser the remembered choice takes over.
  const regulation = useSyncExternalStore(
    subscribeStorage,
    loadRegulation,
    (): NationalRegulation => 'CZ',
  )

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight">{t('app.name')}</h1>
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </header>

      <MovedHint />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('home.chooseClass')}</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">{t('home.regulation')}</p>
          <ToggleGroup
            variant="outline"
            size="lg"
            className="w-full *:h-11 *:flex-1 *:text-base"
            value={[regulation]}
            onValueChange={(v) => v[0] && saveRegulation(v[0] as NationalRegulation)}
          >
            <ToggleGroupItem value="CZ">{t('home.regulation2026')}</ToggleGroupItem>
            <ToggleGroupItem value="CZ-2027">{t('home.regulation2027')}</ToggleGroupItem>
          </ToggleGroup>
          {regulation === 'CZ-2027' && (
            <p className="text-muted-foreground text-sm">{t('home.regulation2027Hint')}</p>
          )}
        </div>
        <div className="grid gap-2">
          {nationalClassIds(regulation).map((id) => (
            <ClassButton key={id} id={id} />
          ))}
        </div>
        <div className="space-y-2 pt-3">
          <p className="text-muted-foreground text-sm">{t('home.international')}</p>
          <div className="grid gap-2">
            {internationalClassIds().map((id) => (
              <ClassButton key={id} id={id} />
            ))}
          </div>
        </div>
      </section>

      <InstallHint />

      <footer className="text-muted-foreground mt-auto flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        <Link href="/o-aplikaci" className="underline underline-offset-4">
          {t('home.about')}
        </Link>
        <FeedbackLink className="underline underline-offset-4">{t('feedback.link')}</FeedbackLink>
      </footer>
    </main>
  )
}

'use client'

import { CLASS_IDS, getClass } from '@rota/content'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { InstallHint, MovedHint } from '@/components/pwa'
import { Button } from '@/components/ui/button'
import { classSlug } from '@/lib/classes'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight">{t('app.name')}</h1>
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </header>

      <MovedHint />
      <InstallHint />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('home.chooseClass')}</h2>
        <div className="grid gap-2">
          {CLASS_IDS.map((id) => {
            const cls = getClass(id)
            const label = t(`classes.${id}`)
            if (!cls) {
              return (
                <Button
                  key={id}
                  variant="outline"
                  disabled
                  className="h-14 justify-between text-base"
                >
                  {label}
                  <span className="text-muted-foreground text-xs">{t('home.comingSoon')}</span>
                </Button>
              )
            }
            return (
              <Button
                key={id}
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
          })}
        </div>
      </section>

      <footer className="text-muted-foreground mt-auto text-center text-sm">
        <Link href="/o-aplikaci" className="underline underline-offset-4">
          {t('home.about')}
        </Link>
      </footer>
    </main>
  )
}

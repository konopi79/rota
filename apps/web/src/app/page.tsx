'use client'

import { CLASS_IDS } from '@rota/content'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12">
      <header className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight">{t('app.name')}</h1>
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('home.chooseClass')}</h2>
        <div className="grid gap-2">
          {CLASS_IDS.map((id) => (
            <Button key={id} variant="outline" size="lg" disabled className="justify-between">
              {t(`classes.${id}`)}
              <span className="text-muted-foreground text-xs">{t('home.comingSoon')}</span>
            </Button>
          ))}
        </div>
      </section>
    </main>
  )
}

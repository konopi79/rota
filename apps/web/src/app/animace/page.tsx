'use client'

import { ChevronLeft } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

// WebGL needs a browser, and three.js should only load on this page.
const ExerciseAnimation = dynamic(
  () => import('@/components/figures/exercise-animation').then((m) => m.ExerciseAnimation),
  { ssr: false },
)

/**
 * Every exercise animation on one page (plan R12) — each also plays in its card's detail
 * (`CardAnimation`). Not linked from the app.
 */
export default function AnimationPage() {
  const { t } = useTranslation()
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-md space-y-1 px-4 pt-4 pb-2">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/" />}>
          <ChevronLeft />
          {t('figures.back')}
        </Button>
        <h1 className="text-xl font-bold tracking-tight">{t('figures.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('figures.intro')}</p>
        <p className="text-muted-foreground text-sm">{t('figures.hint')}</p>
      </div>
      <ExerciseAnimation />
    </main>
  )
}

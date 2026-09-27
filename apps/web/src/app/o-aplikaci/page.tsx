'use client'

import { CZ_RULESET, FCI_RULESET } from '@rota/content'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

const REPO_URL = 'https://github.com/konopi79/rota'

/** "1. 4. 2026" from an ISO date, without depending on the runtime's locale data. */
const czDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d}. ${m}. ${y}`
}

export default function AboutPage() {
  const { t } = useTranslation()
  const section = (title: string, body: React.ReactNode) => (
    <section className="space-y-1.5">
      <h2 className="font-semibold">{title}</h2>
      {body}
    </section>
  )

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" render={<Link href="/" />}>
        <ChevronLeft />
        {t('about.back')}
      </Button>
      <h1 className="text-3xl font-bold tracking-tight">{t('about.title')}</h1>
      <p>{t('about.intro')}</p>
      {section(t('about.unofficialTitle'), <p>{t('about.unofficial')}</p>)}
      {section(
        t('about.sourcesTitle'),
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('about.cz', { date: czDate(CZ_RULESET.validFrom) })}</li>
          <li>{t('about.fci', { date: czDate(FCI_RULESET.validFrom) })}</li>
          <li className="text-muted-foreground">{t('about.cards')}</li>
        </ul>,
      )}
      {section(t('about.privacyTitle'), <p>{t('about.privacy')}</p>)}
      {section(t('about.offlineTitle'), <p>{t('about.offline')}</p>)}
      {section(
        t('about.codeTitle'),
        <p>
          {t('about.code')}{' '}
          <a href={REPO_URL} className="underline underline-offset-4">
            {REPO_URL.replace('https://', '')}
          </a>
        </p>,
      )}
    </main>
  )
}

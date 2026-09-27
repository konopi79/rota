'use client'

import { CZ_RULESET, FCI_RULESET } from '@rota/content'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FEATURE_GROUPS, LATEST_FEATURE_ID } from '@/content/features'
import { GUIDE } from '@/content/guide'

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

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('about.featuresTitle')}</h2>
        {FEATURE_GROUPS.map((group) => (
          <div key={group.title} className="bg-card space-y-3 rounded-lg border p-4">
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {group.title}
            </h3>
            <ul className="space-y-3">
              {group.items.map((item) => (
                <li key={item.id} className="space-y-0.5">
                  <p className="flex items-center gap-2 font-medium">
                    {item.title}
                    {item.id === LATEST_FEATURE_ID && <Badge>{t('about.new')}</Badge>}
                  </p>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section id="navod" className="scroll-mt-6 space-y-3">
        <h2 className="text-xl font-semibold">{t('about.guideTitle')}</h2>
        {GUIDE.map((part) => (
          <div key={part.id} className="bg-card space-y-3 rounded-lg border p-4">
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {part.title}
            </h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {part.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </section>
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
      {section(
        t('about.codeTitle'),
        <p>
          {t('about.code')}{' '}
          <a href={REPO_URL} className="underline underline-offset-4">
            {REPO_URL.replace('https://', '')}
          </a>
        </p>,
      )}
      <p className="text-muted-foreground text-xs">
        {t('about.version', { date: process.env.NEXT_PUBLIC_BUILD_TIME })}
      </p>
    </main>
  )
}

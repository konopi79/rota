'use client'

import { Play } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { animationFor, SUPPLEMENTARY_SHOWN_WITH } from '@/lib/figures/animated'

// WebGL needs a browser, and three.js loads only once someone asks for the animation.
const AnimationPlayer = dynamic(
  () => import('@/components/figures/exercise-animation').then((m) => m.AnimationPlayer),
  { ssr: false, loading: () => <Placeholder /> },
)

function Placeholder({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bg-card text-muted-foreground flex h-[55vh] min-h-72 items-center justify-center rounded-md border">
      {children}
    </div>
  )
}

/**
 * "Jak cvik vypadá" in a card detail: the card's exercise animation (plan R12), started on
 * a tap — until then nothing heavy loads. Cards without an animation show nothing.
 */
export function CardAnimation({ code }: { code: string }) {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const animation = animationFor(code)
  if (!animation) return null

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{t('card.animation')}</h2>
      {animation.variant && (
        <p className="text-muted-foreground text-sm">
          {t('card.animationWith', { code: SUPPLEMENTARY_SHOWN_WITH })}
        </p>
      )}
      {playing ? (
        <AnimationPlayer code={animation.code} initialVariant={animation.variant} inline />
      ) : (
        <button
          type="button"
          className="block w-full"
          onClick={() => setPlaying(true)}
          aria-label={t('card.playAnimation')}
        >
          <Placeholder>
            <span className="bg-background flex items-center gap-2 rounded-full border px-5 py-3 text-base font-medium shadow">
              <Play className="size-5 fill-current" />
              {t('card.playAnimation')}
            </span>
          </Placeholder>
        </button>
      )}
      <p className="text-muted-foreground text-xs">{t('card.animationNote')}</p>
    </section>
  )
}

'use client'

import { getClass, type Card, type ClassId } from '@rota/content'
import { Check, ChevronLeft, Eye, RotateCcw, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { CardImage } from '@/components/deck/card-image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { catalogueCards } from '@/lib/catalogue'
import { classSlug } from '@/lib/classes'
import {
  distractors,
  mainDescription,
  pickNextCard,
  quizSummary,
  recordAnswer,
  shuffle,
  statKey,
  type QuizStats,
} from '@/lib/quiz'
import { quizStatsSnapshot, resetQuizStats, saveQuizStats, subscribeStorage } from '@/lib/storage'

type Mode = 'recall' | 'pick'

type Round = {
  card: Card
  /** Pick mode: the three descriptions in display order. */
  options: Card[]
  revealed: boolean
  picked?: string
}

function newRound(cards: Card[], stats: QuizStats, previous?: string): Round | null {
  const card = pickNextCard(cards, stats, Math.random, previous)
  if (!card) return null
  const options = shuffle([card, ...distractors(card, cards, Math.random)], Math.random)
  return { card, options, revealed: false }
}

/** Quiz over a class's exercises (R8). Client-only: it is random and reads local storage. */
export default function Quiz({ classId }: { classId: ClassId }) {
  const { t } = useTranslation()
  const cls = getClass(classId)
  if (!cls) throw new Error(`No content for ${classId}`)
  const cards = useMemo(() => catalogueCards(cls).filter((c) => c.kind === 'exercise'), [cls])

  const statsJson = useSyncExternalStore(subscribeStorage, quizStatsSnapshot, () => '{}')
  const stats = useMemo(() => JSON.parse(statsJson) as QuizStats, [statsJson])
  const summary = quizSummary(cards, stats)

  const [mode, setMode] = useState<Mode>('recall')
  const [round, setRound] = useState<Round | null>(() => newRound(cards, stats))
  if (!round) return null

  const answer = (correct: boolean, picked?: string) => {
    saveQuizStats(recordAnswer(stats, round.card, correct))
    if (mode === 'recall')
      setRound(newRound(cards, recordAnswer(stats, round.card, correct), round.card.code))
    else setRound({ ...round, picked, revealed: true })
  }
  const next = () => setRound(newRound(cards, stats, round.card.code))
  const reset = () => resetQuizStats(cards.map(statKey))

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href={`/trida/${classSlug(classId)}`} />}
        >
          <ChevronLeft />
          {t('quiz.back')}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('quiz.title', { cls: t(`classes.${classId}`) })}
        </h1>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {t('quiz.summary', { mastered: summary.mastered, total: summary.total })}
          {summary.seen > 0 && (
            <Button variant="ghost" size="xs" onClick={reset}>
              <RotateCcw />
              {t('quiz.reset')}
            </Button>
          )}
        </div>
      </header>

      <ToggleGroup
        variant="outline"
        size="lg"
        value={[mode]}
        onValueChange={(v) => {
          if (!v[0]) return
          setMode(v[0] as Mode)
          next()
        }}
        className="*:h-11 *:px-4 *:text-base"
      >
        <ToggleGroupItem value="recall">{t('quiz.modeRecall')}</ToggleGroupItem>
        <ToggleGroupItem value="pick">{t('quiz.modePick')}</ToggleGroupItem>
      </ToggleGroup>

      <CardImage card={round.card} className="h-[34dvh] w-full" />

      {mode === 'recall' ? (
        <Recall
          round={round}
          onReveal={() => setRound({ ...round, revealed: true })}
          onAnswer={answer}
        />
      ) : (
        <Pick
          round={round}
          onPick={(c) => answer(c.code === round.card.code, c.code)}
          onNext={next}
        />
      )}
    </main>
  )
}

function Recall({
  round,
  onReveal,
  onAnswer,
}: {
  round: Round
  onReveal: () => void
  onAnswer: (correct: boolean) => void
}) {
  const { t } = useTranslation()
  if (!round.revealed) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-center">{t('quiz.recallHint')}</p>
        <Button size="lg" className="h-14 w-full text-lg" onClick={onReveal}>
          <Eye />
          {t('quiz.reveal')}
        </Button>
      </div>
    )
  }
  const { card } = round
  return (
    <div className="space-y-4">
      <section className="space-y-2 text-sm">
        <h2 className="text-base font-semibold">
          {card.code} · {card.name}
        </h2>
        {card.description.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {card.subParts && (
          <ul className="space-y-1">
            {card.subParts.map((part, i) => (
              <li key={i} className="flex items-center gap-2">
                <span>• {part.text}</span>
                {part.main && <Badge variant="secondary">{t('card.mainExercise')}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-14 text-base" onClick={() => onAnswer(false)}>
          <X />
          {t('quiz.dontKnow')}
        </Button>
        <Button className="h-14 text-base" onClick={() => onAnswer(true)}>
          <Check />
          {t('quiz.know')}
        </Button>
      </div>
    </div>
  )
}

function Pick({
  round,
  onPick,
  onNext,
}: {
  round: Round
  onPick: (card: Card) => void
  onNext: () => void
}) {
  const { t } = useTranslation()
  const answered = round.picked !== undefined
  const correct = round.picked === round.card.code
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-center">
        {answered ? (correct ? t('quiz.correct') : t('quiz.wrong')) : t('quiz.pickHint')}
      </p>
      <ol className="space-y-2">
        {round.options.map((option) => {
          const isRight = option.code === round.card.code
          const tone = !answered
            ? 'hover:bg-muted'
            : isRight
              ? 'border-primary bg-primary text-primary-foreground'
              : option.code === round.picked
                ? 'border-destructive text-destructive'
                : 'opacity-60'
          return (
            <li key={option.code}>
              <button
                type="button"
                disabled={answered}
                onClick={() => onPick(option)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${tone}`}
              >
                {mainDescription(option)}
                {answered && (
                  <span className="mt-1 block text-xs font-semibold">
                    {option.code} · {option.name}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
      {answered && (
        <Button size="lg" className="h-14 w-full text-base" onClick={onNext}>
          {t('quiz.next')}
        </Button>
      )}
    </div>
  )
}

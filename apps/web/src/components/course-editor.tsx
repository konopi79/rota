'use client'

import {
  RULESETS,
  customDeck,
  customDeckIssues,
  getCard,
  getClass,
  isCardIssue,
  type Card,
  type ClassId,
  type CustomCard,
  type Deck,
  type DeckEntry,
  type DeckIssue,
  type RoClass,
} from '@rota/content'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Footprints,
  ListOrdered,
  Plus,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { cardImageUrl } from '@/components/deck/card-image'
import { FeedbackLink } from '@/components/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { filterCards, NO_FILTERS } from '@/lib/catalogue'
import { classSlug, customCourseHref } from '@/lib/classes'
import { countedMessages, issueMessage } from '@/lib/course-issues'
import { cn } from '@/lib/utils'
import { encodeDeckParams, MAX_CUSTOM_CARDS, type DeckParams } from '@/lib/deck-url'
import { shareLink } from '@/lib/share'
import { navigate } from '@/lib/stale-page'
import {
  adoptCustomCourse,
  emptyCustomCourse,
  loadCustomCourse,
  loadSetup,
  saveCustomCourse,
  type CustomCourse,
} from '@/lib/storage'

const MAX_RESULTS = 8
/** Read once after hydration: the editor saves on every change and must not remount. */
const noSubscribe = () => () => {}

/**
 * A course put together by hand (plan §12): cards in the order of a course plan, checked
 * against the sequencing rules as they are added — the warnings never block. The course is
 * kept in local storage; walking it or sharing it puts it into the URL.
 */
export function CourseEditor({ classId }: { classId: ClassId }) {
  const cls = getClass(classId)
  if (!cls) throw new Error(`No content for ${classId}`)
  const stored = useSyncExternalStore(
    noSubscribe,
    () => JSON.stringify(loadCustomCourse(cls)),
    () => JSON.stringify(emptyCustomCourse()),
  )
  return <Editor key={stored} cls={cls} initial={JSON.parse(stored) as CustomCourse} />
}

/**
 * Opens a deck's cards in the editor — a dealt course to adjust, or a hand-made one shared
 * as a link. Asks before replacing a different course in progress.
 */
export function useOpenInEditor(cls: RoClass) {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    deck: Deck,
    { guidelines, strict, unchecked }: Pick<DeckParams, 'guidelines' | 'strict' | 'unchecked'>,
  ) => {
    const course: CustomCourse = {
      startSide: deck.options.startSide,
      cards: deck.entries.map(({ code, supplementary, withPrevious }) => ({
        code,
        ...(supplementary && { supplementary }),
        ...(withPrevious && { withPrevious }),
      })),
      checks: !unchecked,
      guidelines: guidelines ?? false,
      strict: strict ?? false,
    }
    if (adoptCustomCourse(cls, course, () => window.confirm(t('custom.replaceConfirm')))) {
      navigate(router.push, customCourseHref(cls.id))
    }
  }
}

function Editor({ cls, initial }: { cls: RoClass; initial: CustomCourse }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [course, setCourse] = useState(initial)
  const [query, setQuery] = useState('')
  const search = useRef<HTMLInputElement>(null)

  const change = (next: CustomCourse) => {
    setCourse(next)
    saveCustomCourse(cls.id, next)
  }
  const setCards = (cards: CustomCard[]) => change({ ...course, cards })
  const add = (card: Card) => {
    if (course.cards.length >= MAX_CUSTOM_CARDS) return
    const supplementary = card.sequencing.requiresSupplementary
      ? cls.course.supplementary[0]
      : undefined
    setCards([
      ...course.cards,
      supplementary ? { code: card.code, supplementary } : { code: card.code },
    ])
    setQuery('')
    search.current?.focus()
  }
  // The stations stay where they are (`withPrevious` goes with the place): a card moved within
  // or out of a station of several (CNDC) trades places with its neighbour.
  const move = (i: number, by: number) => {
    const cards = [...course.cards]
    const [a, b] = [cards[i], cards[i + by]]
    if (!a || !b) return
    const card = ({ code, supplementary }: CustomCard, at: CustomCard): CustomCard => ({
      code,
      ...(supplementary && { supplementary }),
      ...(at.withPrevious && { withPrevious: true }),
    })
    cards[i] = card(b, a)
    cards[i + by] = card(a, b)
    setCards(cards)
  }
  // A station's first card removed: the next one starts it.
  const remove = (i: number) => {
    const cards = [...course.cards]
    const next = cards[i + 1]
    if (!cards[i]?.withPrevious && next?.withPrevious) {
      const { withPrevious: _, ...rest } = next
      cards[i + 1] = rest
    }
    setCards(cards.filter((_, j) => j !== i))
  }
  const setStation = (i: number, withPrevious: boolean) =>
    setCards(
      course.cards.map((c, j) => {
        if (j !== i) return c
        const { withPrevious: _, ...rest } = c
        return withPrevious ? { ...rest, withPrevious: true } : rest
      }),
    )

  const deck = useMemo(() => customDeck(cls.id, course.startSide, course.cards), [cls.id, course])
  // The judges' guidelines exist for the national classes only, the safe side of CNDC where
  // the class has them.
  const hasGuidelines = RULESETS[cls.ruleset].national
  const hasCndc = !!cls.course.cndc
  const level = checkLevel(course, hasGuidelines, hasCndc)
  const guidelines = level === 'guidelines' || level === 'strict'
  const strict = level === 'strict'
  const issues = useMemo(
    () => (level !== 'off' ? customDeckIssues(deck, { guidelines, strict }) : []),
    [deck, level, guidelines, strict],
  )
  const courseMessages = countedMessages(
    issues.filter((issue) => !isCardIssue(issue)).map((issue) => issueMessage(issue, cls, t)),
  )
  const exercises = useMemo(
    () =>
      cls.cardCodes
        .map((code) => getCard(cls.ruleset, code))
        .filter((card): card is Card => card?.kind === 'exercise'),
    [cls],
  )
  const results = query.trim()
    ? filterCards(cls, exercises, { ...NO_FILTERS, query }).slice(0, MAX_RESULTS)
    : []
  // After a leave card: the recall / return cards that must (national) or may (FCI) follow.
  const lastCard = course.cards.length
    ? getCard(cls.ruleset, course.cards.at(-1)?.code ?? '')
    : undefined
  const followUps = (lastCard?.sequencing.nextOneOf ?? lastCard?.sequencing.mayBeFollowedBy ?? [])
    .filter((code) => cls.cardCodes.includes(code))
    .map((code) => getCard(cls.ruleset, code))
    .filter((card): card is Card => card !== undefined)

  const courseQuery = (setup: Pick<DeckParams, 'showDescription' | 'speak'>) =>
    encodeDeckParams({
      options: deck.options,
      order: course.cards,
      guidelines,
      strict,
      unchecked: level === 'off',
      ...setup,
      position: 0,
    })
  // The setup's description and voice options come along; read on the tap, not in render
  // (local storage is not there in the prerendered HTML).
  const open = (path: '/balicek' | '/parkur') => {
    const { showDescription, speak } = loadSetup(cls)
    navigate(router.push, `${path}?${courseQuery({ showDescription, speak })}`)
  }
  // A shared course opens as its course page: the list, walk it, or take it into the editor.
  // The sharer's own description and voice options stay at home.
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = `${window.location.origin}/parkur?${courseQuery({ showDescription: false })}`
    const title = t('custom.shareTitle', { cls: t(`classes.${cls.id}`) })
    if ((await shareLink(url, title)) === 'copied') setCopied(true)
  }
  const empty = course.cards.length === 0

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <header className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href={`/trida/${classSlug(cls.id)}`} />}
        >
          <ChevronLeft />
          {t('custom.back')}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('custom.title', { cls: t(`classes.${cls.id}`) })}
        </h1>
        <p className="text-muted-foreground">{t('custom.intro')}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-medium">{t('custom.startSide')}</h2>
        <ToggleGroup
          variant="outline"
          size="lg"
          className="*:h-11 *:px-4 *:text-base"
          value={[course.startSide]}
          onValueChange={(v) =>
            v[0] && change({ ...course, startSide: v[0] as CustomCourse['startSide'] })
          }
        >
          <ToggleGroupItem value="left">{t('setup.left')}</ToggleGroupItem>
          <ToggleGroupItem value="right">{t('setup.right')}</ToggleGroupItem>
        </ToggleGroup>
      </section>

      {/* How strictly the order is checked: not at all, the regulation, the judges' guidelines,
          or the safe side the dealer keeps to as well (CNDC). */}
      <section className="space-y-2">
        <h2 className="text-base font-medium">{t('custom.checks')}</h2>
        <ToggleGroup
          variant="outline"
          size="lg"
          className="flex-wrap *:h-11 *:px-3 *:text-base"
          value={[level]}
          onValueChange={(v) => v[0] && change({ ...course, ...levelFlags(v[0] as CheckLevel) })}
        >
          {CHECK_LEVELS.filter(
            (l) => (l !== 'guidelines' || hasGuidelines) && (l !== 'strict' || hasCndc),
          ).map((l) => (
            <ToggleGroupItem key={l} value={l}>
              {t(`custom.check.${l}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-muted-foreground text-sm">{t(`custom.checkHint.${level}`)}</p>
      </section>

      {!empty && level !== 'off' && (
        <div className="space-y-2">
          <p
            className={
              issues.length ? 'text-destructive flex gap-2' : 'text-muted-foreground flex gap-2'
            }
          >
            {issues.length ? (
              <CircleAlert className="mt-0.5 size-5 shrink-0" />
            ) : (
              <CircleCheck className="mt-0.5 size-5 shrink-0" />
            )}
            {issues.length ? t('custom.warnings', { count: issues.length }) : t('custom.ok')}
          </p>
          {/* Rules of the whole course (the guidelines): not tied to one card. */}
          {courseMessages.length > 0 && (
            <ul className="text-destructive space-y-1 pl-7 text-sm">
              {courseMessages.map((message) => (
                <li key={message} className="list-disc">
                  {message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {empty ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center">
          {t('custom.empty')}
        </p>
      ) : (
        <ol className="divide-y rounded-lg border">
          {deck.entries.map((entry, i) => (
            <EditorRow
              key={i}
              cls={cls}
              number={i + 1}
              entry={entry}
              sideChanged={i > 0 && deck.entries[i - 1]?.side !== entry.side}
              issues={issues.filter((issue) => isCardIssue(issue) && issue.index === i)}
              isFirst={i === 0}
              isLast={i === deck.entries.length - 1}
              station={
                entry.withPrevious
                  ? 'next'
                  : deck.entries[i + 1]?.withPrevious
                    ? 'first'
                    : undefined
              }
              // Several cards at one station (CNDC) where the class has them.
              onStation={hasCndc && i > 0 ? (on) => setStation(i, on) : undefined}
              onMove={(by) => move(i, by)}
              onRemove={() => remove(i)}
              onSupplementary={(supplementary) =>
                setCards(course.cards.map((c, j) => (j === i ? { ...c, supplementary } : c)))
              }
            />
          ))}
        </ol>
      )}

      <section className="space-y-2">
        {followUps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('custom.followUps')}</span>
            {followUps.map((card) => (
              <Button key={card.code} variant="secondary" size="lg" onClick={() => add(card)}>
                <Plus />
                {card.code}
              </Button>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />
          <Input
            ref={search}
            type="search"
            inputMode="search"
            className="h-12 pl-10 text-base"
            placeholder={t('custom.add')}
            aria-label={t('custom.add')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) add(results[0])
            }}
          />
        </div>
        {query.trim() &&
          (results.length ? (
            <ul className="divide-y rounded-lg border">
              {results.map((card) => (
                <li key={card.code}>
                  <button
                    type="button"
                    className="hover:bg-accent flex w-full items-center gap-3 p-2 text-left text-sm"
                    onClick={() => add(card)}
                  >
                    <Thumb card={card} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="font-semibold">{card.code}</span> {card.name}
                    </span>
                    <Plus className="text-muted-foreground size-5 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t('custom.noMatch')}</p>
          ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          className="h-12 text-base"
          disabled={empty}
          onClick={() => open('/balicek')}
        >
          <Footprints />
          {t('custom.walk')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 text-base"
          disabled={empty}
          onClick={() => open('/parkur')}
        >
          <ListOrdered />
          {t('custom.show')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 text-base"
          disabled={empty}
          onClick={() => void share()}
        >
          <Share2 />
          {copied ? t('course.copied') : t('course.share')}
        </Button>
        {!empty && (
          <Button
            variant="ghost"
            size="lg"
            className="ml-auto h-12"
            onClick={() => window.confirm(t('custom.clearConfirm')) && setCards([])}
          >
            <Trash2 />
            {t('custom.clear')}
          </Button>
        )}
      </div>
      <FeedbackLink
        className="text-muted-foreground self-center text-sm underline underline-offset-4"
        course={() =>
          empty
            ? undefined
            : `${window.location.origin}/parkur?${courseQuery({ showDescription: false })}`
        }
      >
        {t('feedback.link')}
      </FeedbackLink>
    </main>
  )
}

function EditorRow({
  cls,
  number,
  entry,
  sideChanged,
  issues,
  isFirst,
  isLast,
  station,
  onStation,
  onMove,
  onRemove,
  onSupplementary,
}: {
  cls: RoClass
  number: number
  entry: DeckEntry
  sideChanged: boolean
  issues: DeckIssue[]
  isFirst: boolean
  isLast: boolean
  /** In a group at one station (CNDC): its first card or one after it. */
  station?: 'first' | 'next'
  /** Done at the station of the card before, or not (CNDC; missing: not offered). */
  onStation?: (withPrevious: boolean) => void
  onMove: (by: number) => void
  onRemove: () => void
  onSupplementary: (code: string) => void
}) {
  const { t } = useTranslation()
  const card = getCard(cls.ruleset, entry.code) as Card
  return (
    <li
      className={cn(
        'space-y-2 p-2',
        // A group at one station: one bar along its cards, no line between them.
        station && 'border-l-primary border-l-4',
        station === 'next' && 'border-t-0',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="w-7 text-center text-lg font-bold tabular-nums">{number}</span>
        <Thumb card={card} />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="leading-tight">
            <span className="font-semibold">{card.code}</span> {card.name}
          </p>
          {(entry.pace !== 'normal' || sideChanged || entry.side === 'right') && (
            <div className="flex flex-wrap gap-1">
              {entry.pace === 'slow' && <Badge variant="secondary">{t('deck.paceSlow')}</Badge>}
              {entry.pace === 'fast' && <Badge variant="secondary">{t('deck.paceFast')}</Badge>}
              {(sideChanged || entry.side === 'right') && (
                <Badge variant={entry.side === 'right' ? 'default' : 'outline'}>
                  {t(entry.side === 'right' ? 'course.dogRight' : 'course.dogLeft')}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t('custom.moveUp')}
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t('custom.moveDown')}
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <ArrowDown />
          </Button>
        </div>
        <Button variant="ghost" size="icon-lg" aria-label={t('custom.remove')} onClick={onRemove}>
          <X />
        </Button>
      </div>
      {card.sequencing.requiresSupplementary && (
        <div className="flex flex-wrap items-center gap-2 pl-10 text-sm">
          <span className="text-muted-foreground">{t('custom.supplementary')}</span>
          <ToggleGroup
            variant="outline"
            size="lg"
            value={entry.supplementary ? [entry.supplementary] : []}
            onValueChange={(v) => v[0] && onSupplementary(v[0] as string)}
          >
            {cls.course.supplementary.map((code) => (
              <ToggleGroupItem key={code} value={code}>
                {code}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
      {onStation && (
        <div className="flex items-center gap-2 pl-10 text-sm">
          <Switch
            id={`station-${number}`}
            checked={!!entry.withPrevious}
            onCheckedChange={(checked) => onStation(checked)}
          />
          <Label htmlFor={`station-${number}`} className="text-muted-foreground font-normal">
            {t('custom.withPrevious')}
          </Label>
        </div>
      )}
      {issues.length > 0 && (
        <ul className="text-destructive space-y-1 pl-10 text-sm">
          {issues.map((issue, j) => (
            <li key={j} className="flex gap-1.5">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {issueMessage(issue, cls, t)}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** How strictly a hand-made course is checked (plan §12, R18). */
const CHECK_LEVELS = ['off', 'rules', 'guidelines', 'strict'] as const
type CheckLevel = (typeof CHECK_LEVELS)[number]

/** The level the stored switches say — none above what the class has. */
function checkLevel(course: CustomCourse, hasGuidelines: boolean, hasCndc: boolean): CheckLevel {
  if (!course.checks) return 'off'
  if (course.strict && hasCndc) return 'strict'
  if ((course.guidelines || course.strict) && hasGuidelines) return 'guidelines'
  return 'rules'
}

const levelFlags = (level: CheckLevel): Pick<CustomCourse, 'checks' | 'guidelines' | 'strict'> => ({
  checks: level !== 'off',
  guidelines: level === 'guidelines' || level === 'strict',
  strict: level === 'strict',
})

function Thumb({ card }: { card: Card }) {
  return (
    <Image
      src={cardImageUrl(card, 'thumb')}
      alt=""
      width={400}
      height={283}
      className="h-auto w-16 shrink-0 rounded-sm border sm:w-20"
    />
  )
}

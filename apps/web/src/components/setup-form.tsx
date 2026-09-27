'use client'

import {
  EQUIPMENT,
  getCard,
  getClass,
  randomSeed,
  type ClassId,
  type Equipment,
} from '@rota/content'
import {
  ChevronLeft,
  GraduationCap,
  LayoutGrid,
  ListOrdered,
  Minus,
  Plus,
  Shuffle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { classSlug } from '@/lib/classes'
import { encodeDeckParams } from '@/lib/deck-url'
import { defaultSetup, loadSetup, saveSetup, subscribeStorage, type Setup } from '@/lib/storage'

const EQUIPMENT_LABEL: Record<Equipment, string> = {
  cones: 'setup.cones',
  bowls: 'setup.bowls',
  jump: 'setup.jump',
}

/**
 * The static HTML is rendered with the default setup; in the browser the stored one takes
 * over. Reading storage through `useSyncExternalStore` and remounting the form with a
 * `key` avoids both a hydration mismatch and a setState-in-effect reset.
 */
export function SetupForm({ classId }: { classId: ClassId }) {
  const cls = getClass(classId)
  if (!cls) throw new Error(`No content for ${classId}`)
  const stored = useSyncExternalStore(
    subscribeStorage,
    () => JSON.stringify(loadSetup(cls)),
    () => JSON.stringify(defaultSetup(cls)),
  )
  return <SetupFields key={stored} classId={classId} initial={JSON.parse(stored) as Setup} />
}

function SetupFields({ classId, initial }: { classId: ClassId; initial: Setup }) {
  const { t } = useTranslation()
  const router = useRouter()
  const cls = getClass(classId)
  if (!cls) throw new Error(`No content for ${classId}`)

  const [setup, setSetup] = useState<Setup>(initial)
  const update = (patch: Partial<Setup>) => setSetup((s) => ({ ...s, ...patch }))

  const hasNewScope = cls.newCardCodes.length > 0 && cls.newCardCodes.length < cls.cardCodes.length
  const scopeCodes = setup.scope === 'new' && hasNewScope ? cls.newCardCodes : cls.cardCodes
  // Upper bound for the stepper: main cards usable with the equipment at hand.
  const pool = scopeCodes.filter((code) => {
    const card = getCard(cls.ruleset, code)
    if (!card || card.sequencing.onlyAfterLeave) return false
    return (card.sequencing.equipment ?? []).every((e) => setup.equipment.includes(e))
  }).length
  const count = Math.min(setup.count, pool)

  const start = () => {
    saveSetup(classId, setup)
    const startSide =
      setup.startSide === 'random' ? (Math.random() < 0.5 ? 'left' : 'right') : setup.startSide
    const query = encodeDeckParams({
      options: {
        classId,
        scope: hasNewScope ? setup.scope : 'all',
        count,
        equipment: setup.equipment,
        startSide,
        seed: randomSeed(),
      },
      showDescription: setup.showDescription,
      position: 0,
    })
    router.push(`/balicek?${query}`)
  }

  // A competition course (R7): all equipment, the class's full course size window.
  const buildCourse = () => {
    saveSetup(classId, setup)
    const { minCards, maxCards } = cls.course
    const startSide =
      setup.startSide === 'random' ? (Math.random() < 0.5 ? 'left' : 'right') : setup.startSide
    const query = encodeDeckParams({
      options: {
        classId,
        scope: 'all',
        count: Math.min(maxCards, Math.max(minCards, setup.count)),
        equipment: [...EQUIPMENT],
        startSide,
        seed: randomSeed(),
        competition: true,
      },
      showDescription: setup.showDescription,
      position: 0,
    })
    router.push(`/parkur?${query}`)
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-6 py-8">
      <header className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/" />}>
          <ChevronLeft />
          {t('setup.back')}
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{t(`classes.${classId}`)}</h1>
        <p className="text-muted-foreground flex items-center gap-3">
          {t('home.cardCount', { count: cls.cardCodes.length })}
          <Link
            href={`/trida/${classSlug(classId)}/karty`}
            className="text-foreground inline-flex items-center gap-1 underline underline-offset-4"
          >
            <LayoutGrid className="size-4" />
            {t('setup.browseCards')}
          </Link>
        </p>
      </header>

      {hasNewScope && (
        <Field
          label={t('setup.cards')}
          hint={setup.scope === 'new' ? t('setup.newOnlyHint') : undefined}
        >
          <ToggleGroup
            variant="outline"
            size="lg"
            className="*:h-11 *:px-4 *:text-base"
            value={[setup.scope]}
            onValueChange={(v) => v[0] && update({ scope: v[0] as Setup['scope'] })}
          >
            <ToggleGroupItem value="all">{t('setup.wholeClass')}</ToggleGroupItem>
            <ToggleGroupItem value="new">{t('setup.newOnly')}</ToggleGroupItem>
          </ToggleGroup>
        </Field>
      )}

      <Field
        label={t('setup.count')}
        hint={t('setup.countHint', { min: cls.course.minCards, max: cls.course.maxCards })}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={t('setup.fewer')}
            disabled={count <= 1}
            onClick={() => update({ count: Math.max(1, count - 1) })}
          >
            <Minus />
          </Button>
          <span className="w-12 text-center text-2xl font-semibold tabular-nums">{count}</span>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={t('setup.more')}
            disabled={count >= pool}
            onClick={() => update({ count: Math.min(pool, count + 1) })}
          >
            <Plus />
          </Button>
        </div>
      </Field>

      <Field label={t('setup.equipment')} hint={t('setup.equipmentHint')}>
        <ToggleGroup
          multiple
          variant="outline"
          size="lg"
          className="*:h-11 *:px-4 *:text-base"
          value={setup.equipment}
          onValueChange={(v) =>
            update({ equipment: EQUIPMENT.filter((e) => (v as string[]).includes(e)) })
          }
        >
          {EQUIPMENT.map((e) => (
            <ToggleGroupItem key={e} value={e}>
              {t(EQUIPMENT_LABEL[e])}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field label={t('setup.startSide')}>
        <ToggleGroup
          variant="outline"
          size="lg"
          className="*:h-11 *:px-4 *:text-base"
          value={[setup.startSide]}
          onValueChange={(v) => v[0] && update({ startSide: v[0] as Setup['startSide'] })}
        >
          <ToggleGroupItem value="left">{t('setup.left')}</ToggleGroupItem>
          <ToggleGroupItem value="right">{t('setup.right')}</ToggleGroupItem>
          <ToggleGroupItem value="random">{t('setup.random')}</ToggleGroupItem>
        </ToggleGroup>
      </Field>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="show-description" className="text-base">
          {t('setup.showDescription')}
        </Label>
        <Switch
          id="show-description"
          checked={setup.showDescription}
          onCheckedChange={(checked) => update({ showDescription: checked })}
        />
      </div>

      <Button size="lg" className="mt-2 h-14 text-lg" onClick={start}>
        <Shuffle />
        {t('setup.start')}
      </Button>
      <Button variant="outline" size="lg" className="-mt-3 h-12 text-base" onClick={buildCourse}>
        <ListOrdered />
        {t('setup.course')}
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="-mt-3 h-12 text-base"
        render={<Link href={`/trida/${classSlug(classId)}/kviz`} />}
      >
        <GraduationCap />
        {t('setup.quiz')}
      </Button>
    </main>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">{label}</h2>
      {children}
      {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
    </section>
  )
}

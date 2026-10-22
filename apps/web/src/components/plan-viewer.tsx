'use client'

import type { Card, DeckEntry, Layout } from '@rota/content'
import { Minus, Plus, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useWakeLock } from '@/components/deck/use-wake-lock'
import { FieldPlan, planAspect } from '@/components/field-plan'
import { Button } from '@/components/ui/button'

/** Zoom 1 = the whole plan on the screen. */
const MIN_ZOOM = 1
const MAX_ZOOM = 5
/** One tap on + or −. */
const ZOOM_STEP = 1.5

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

type Point = { x: number; y: number }

/**
 * The field plan over the whole screen, to be read closely (author, 2026-10-22): it opens
 * fitted to the screen, + and − or two fingers zoom in on it, one finger moves it around
 * (both handled here — the browser's own gestures are off on the plan).
 * The screen stays on, like the course on one screen.
 */
export function PlanViewer({
  title,
  layout,
  entries,
  card,
  round,
  onClose,
}: {
  title: string
  layout: Layout
  entries: DeckEntry[]
  card: (code: string) => Card
  round: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  useWakeLock()
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number }>()
  const [zoom, setZoom] = useState(MIN_ZOOM)
  // The point of the plan to keep in place while zooming: where it is on the screen and
  // where it was in the plan, as a share of the plan's size.
  const anchor = useRef<{ screen: Point; share: Point }>(undefined)
  const pinch = useRef<{ pointers: Map<number, Point>; distance?: number; zoom?: number }>({
    pointers: new Map(),
  })

  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const aspect = planAspect(layout)
  const fit = size ? Math.min(size.width, size.height * aspect) : 0
  const width = fit * zoom
  const height = width / aspect

  // After a zoom, scroll so the anchored point of the plan is where it was on the screen.
  useLayoutEffect(() => {
    const el = box.current
    const a = anchor.current
    if (!el || !a) return
    anchor.current = undefined
    const left = Math.max(0, (el.clientWidth - width) / 2)
    const top = Math.max(0, (el.clientHeight - height) / 2)
    el.scrollLeft = left + a.share.x * width - a.screen.x
    el.scrollTop = top + a.share.y * height - a.screen.y
  }, [width, height])

  /** Zooms keeping `screen` (a point of the box, default its middle) in place. */
  const zoomTo = (next: number, screen?: Point) => {
    const el = box.current
    const target = clampZoom(next)
    if (!el || target === zoom) return
    const at = screen ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 }
    const left = Math.max(0, (el.clientWidth - width) / 2)
    const top = Math.max(0, (el.clientHeight - height) / 2)
    anchor.current = {
      screen: at,
      share: {
        x: (el.scrollLeft + at.x - left) / width,
        y: (el.scrollTop + at.y - top) / height,
      },
    }
    setZoom(target)
  }

  const pointerAt = (event: React.PointerEvent): Point => {
    const rect = box.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }
  const twoFingers = () => {
    const [a, b] = [...pinch.current.pointers.values()]
    if (!a || !b) return undefined
    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    }
  }
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') return
    pinch.current.pointers.set(event.pointerId, pointerAt(event))
    const fingers = twoFingers()
    if (fingers) {
      pinch.current.distance = fingers.distance
      pinch.current.zoom = zoom
    }
  }
  const onPointerMove = (event: React.PointerEvent) => {
    const p = pinch.current
    const before = p.pointers.get(event.pointerId)
    if (!before) return
    const now = pointerAt(event)
    p.pointers.set(event.pointerId, now)
    const fingers = twoFingers()
    if (fingers && p.distance && p.zoom) {
      zoomTo((p.zoom * fingers.distance) / p.distance, fingers.middle)
    } else if (p.pointers.size === 1 && box.current) {
      // One finger moves the plan (the browser's own panning is off, it would take the
      // first finger of a pinch).
      box.current.scrollLeft -= now.x - before.x
      box.current.scrollTop -= now.y - before.y
    }
  }
  const onPointerUp = (event: React.PointerEvent) => {
    const p = pinch.current
    p.pointers.delete(event.pointerId)
    if (p.pointers.size < 2) p.distance = p.zoom = undefined
  }

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center gap-1 px-2 pt-[max(env(safe-area-inset-top),0.25rem)]">
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">{title}</h2>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t('plan.zoomOut')}
          disabled={zoom <= MIN_ZOOM}
          onClick={() => zoomTo(zoom / ZOOM_STEP)}
        >
          <Minus />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t('plan.zoomIn')}
          disabled={zoom >= MAX_ZOOM}
          onClick={() => zoomTo(zoom * ZOOM_STEP)}
        >
          <Plus />
        </Button>
        <Button variant="ghost" size="icon-lg" aria-label={t('plan.close')} onClick={onClose}>
          <X />
        </Button>
      </header>
      <div
        ref={box}
        className="min-h-0 flex-1 touch-none overflow-auto overscroll-contain"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {fit > 0 && (
          <div className="flex min-h-full min-w-full items-center justify-center">
            <div className="shrink-0" style={{ width, height }}>
              <FieldPlan
                layout={layout}
                entries={entries}
                card={card}
                round={round}
                title={t('plan.title')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

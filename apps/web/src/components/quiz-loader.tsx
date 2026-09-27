'use client'

import type { ClassId } from '@rota/content'
import dynamic from 'next/dynamic'

// Random by nature and backed by local storage: render in the browser only, so the
// prerendered HTML never disagrees with the first client render.
const Quiz = dynamic(() => import('./quiz'), { ssr: false })

export function QuizLoader({ classId }: { classId: ClassId }) {
  return <Quiz classId={classId} />
}

import { CLASSES } from '@rota/content'
import { notFound } from 'next/navigation'

import { QuizLoader } from '@/components/quiz-loader'
import { classFromSlug, classSlug } from '@/lib/classes'

export const dynamicParams = false

export function generateStaticParams() {
  return CLASSES.map((cls) => ({ id: classSlug(cls.id) }))
}

export default async function QuizPage({ params }: PageProps<'/trida/[id]/kviz'>) {
  const { id } = await params
  const classId = classFromSlug(id)
  if (!classId) notFound()
  return <QuizLoader classId={classId} />
}

import { CLASSES } from '@rota/content'
import { notFound } from 'next/navigation'

import { SetupForm } from '@/components/setup-form'
import { classFromSlug, classSlug } from '@/lib/classes'

export const dynamicParams = false

export function generateStaticParams() {
  return CLASSES.map((cls) => ({ id: classSlug(cls.id) }))
}

export default async function ClassPage({ params }: PageProps<'/trida/[id]'>) {
  const { id } = await params
  const classId = classFromSlug(id)
  if (!classId) notFound()
  return <SetupForm classId={classId} />
}

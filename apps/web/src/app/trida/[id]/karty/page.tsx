import { CLASSES } from '@rota/content'
import { notFound } from 'next/navigation'

import { Catalogue } from '@/components/catalogue'
import { classFromSlug, classSlug } from '@/lib/classes'

export const dynamicParams = false

export function generateStaticParams() {
  return CLASSES.map((cls) => ({ id: classSlug(cls.id) }))
}

export default async function ClassCardsPage({ params }: PageProps<'/trida/[id]/karty'>) {
  const { id } = await params
  const classId = classFromSlug(id)
  if (!classId) notFound()
  return <Catalogue classId={classId} />
}

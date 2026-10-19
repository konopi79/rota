import { CLASSES } from '@rota/content'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { Catalogue, CatalogueFromUrl } from '@/components/catalogue'
import { NO_FILTERS } from '@/lib/catalogue'
import { classFromSlug, classSlug } from '@/lib/classes'

export const dynamicParams = false

export function generateStaticParams() {
  return CLASSES.map((cls) => ({ id: classSlug(cls.id) }))
}

export default async function ClassCardsPage({ params }: PageProps<'/trida/[id]/karty'>) {
  const { id } = await params
  const classId = classFromSlug(id)
  if (!classId) notFound()
  // The filters are search params, readable only in the browser: the prerendered page is
  // the unfiltered catalogue, swapped for the URL's filters once it loads.
  return (
    <Suspense fallback={<Catalogue classId={classId} initialFilters={NO_FILTERS} />}>
      <CatalogueFromUrl classId={classId} />
    </Suspense>
  )
}

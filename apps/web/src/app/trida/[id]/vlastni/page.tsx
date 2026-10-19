import { CLASSES } from '@rota/content'
import { notFound } from 'next/navigation'

import { CourseEditor } from '@/components/course-editor'
import { classFromSlug, classSlug } from '@/lib/classes'

export const dynamicParams = false

export function generateStaticParams() {
  return CLASSES.map((cls) => ({ id: classSlug(cls.id) }))
}

export default async function CustomCoursePage({ params }: PageProps<'/trida/[id]/vlastni'>) {
  const { id } = await params
  const classId = classFromSlug(id)
  if (!classId) notFound()
  return <CourseEditor classId={classId} />
}

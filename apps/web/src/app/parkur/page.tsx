import { Suspense } from 'react'

import { CourseView } from '@/components/course-view'

// Like /balicek: the course is described by search params (see CLAUDE.md, "Static export").
export default function CoursePage() {
  return (
    <Suspense>
      <CourseView />
    </Suspense>
  )
}

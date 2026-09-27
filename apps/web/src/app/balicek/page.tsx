import { Suspense } from 'react'

import { DeckView } from '@/components/deck/deck-view'

// The deck is described by search params, which a static export can only read in the
// browser — hence the Suspense boundary (see CLAUDE.md, "Static export").
export default function DeckPage() {
  return (
    <Suspense>
      <DeckView />
    </Suspense>
  )
}

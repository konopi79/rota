import type { Metadata } from 'next'

// All the animations on one page; each also plays in its card's detail. Not linked from the
// app and kept out of search engines — the card details are the way in.
export const metadata: Metadata = {
  title: 'Animace cviků',
  robots: { index: false, follow: false },
}

export default function AnimationLayout({ children }: LayoutProps<'/animace'>) {
  return children
}

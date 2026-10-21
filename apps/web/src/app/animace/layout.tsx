import type { Metadata } from 'next'

// Not linked from the app, and kept out of search engines: the address goes only to the
// people asked whether exercise animations are wanted.
export const metadata: Metadata = {
  title: 'Animace cviků – ukázka',
  robots: { index: false, follow: false },
}

export default function AnimationLayout({ children }: LayoutProps<'/animace'>) {
  return children
}

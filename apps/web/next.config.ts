import type { NextConfig } from 'next'
import { resolve } from 'path'

// When this version was built, shown on /o-aplikaci: an installed app updates itself in the
// background, and this is how anyone can tell which version their phone runs. Formatted
// here, once, so the prerendered HTML and the browser never disagree.
const buildTime = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date())

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_TIME: buildTime },
  // ROTA has no server features: everything is prebuilt into `out/` and served as
  // static files (plan D3). That also means `headers()`/`redirects()` do nothing here —
  // security headers belong to the static server's config (R6).
  output: 'export',
  // The image optimiser needs a server; card images are pre-sized webp anyway (plan §4).
  images: { unoptimized: true },
  turbopack: {
    root: resolve(__dirname, '../..'),
    resolveAlias: {
      tailwindcss: resolve(__dirname, 'node_modules/tailwindcss'),
    },
  },
}

export default nextConfig

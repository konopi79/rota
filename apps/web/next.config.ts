import type { NextConfig } from 'next'
import { resolve } from 'path'

const nextConfig: NextConfig = {
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

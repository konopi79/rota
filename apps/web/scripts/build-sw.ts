/**
 * Post-build step (R5): bundle src/sw.ts into out/sw.js and inject the precache manifest
 * of everything in out/. Runs after `next build` (see package.json "build") — the
 * bundler-independent route verified in R0, no Next/Turbopack plugin.
 */
import { injectManifest } from '@serwist/build'

const OUT = 'out'
const SW = `${OUT}/sw.js`

const bundle = await Bun.build({
  entrypoints: ['src/sw.ts'],
  target: 'browser',
  minify: true,
})
if (!bundle.success) throw new AggregateError(bundle.logs, 'sw.ts failed to bundle')
await Bun.write(SW, bundle.outputs[0]!)

const { count, size, warnings } = await injectManifest({
  swSrc: SW,
  swDest: SW,
  globDirectory: OUT,
  globPatterns: ['**/*.{html,txt,js,css,woff2,webp,png,svg,ico,webmanifest,json}'],
  globIgnores: ['sw.js', '404.html'],
  // Card images are the bulk; the default 2 MB per file is plenty, the total is what matters.
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
})
for (const w of warnings) console.warn(w)
console.log(`sw.js: ${count} files precached, ${(size / 1024 / 1024).toFixed(1)} MB`)

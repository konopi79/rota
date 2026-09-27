/**
 * App icons for the PWA manifest and iOS (R5), rendered from src/app/icon.svg.
 *
 *   cd apps/web && bun run scripts/icons.ts
 *
 * Output is committed; re-run only when the SVG changes.
 */
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const rounded = readFileSync('src/app/icon.svg')
// iOS and maskable icons get their shape from the platform: square tile, no corners.
const square = Buffer.from(rounded.toString().replace('rx="112"', 'rx="0"'))
const out = 'public/icons'

const render = (svg: Buffer, size: number) => sharp(svg, { density: 300 }).resize(size, size)

await render(rounded, 192).png().toFile(`${out}/icon-192.png`)
await render(rounded, 512).png().toFile(`${out}/icon-512.png`)
await render(square, 180).png().toFile(`${out}/apple-touch-icon.png`)
// Maskable: keep the arrow inside the safe zone (inner 80 %) on a full-bleed background.
await render(square, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#1c1f26' })
  .png()
  .toFile(`${out}/icon-maskable-512.png`)
console.log('icons written to', out)

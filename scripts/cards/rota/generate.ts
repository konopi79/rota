/**
 * Writes ROTA's own 2027 cards (plan R23): `apps/web/public/cards/cz-2027/<code>.webp` and
 * `thumb/`, the same sizes as the national images, plus a contact sheet
 * `.cache/cards2027/sheet.html` to review. Run with `bun run cards:draw`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { CZ_2027_CARDS } from '../../../packages/content/src/cz-2027'
import { DRAWINGS } from './cards-2027'
import { card } from './draw'

const ROOT = join(import.meta.dir, '../../..')
const OUT_DIR = join(ROOT, 'apps/web/public/cards/cz-2027')
const SHEET_DIR = join(ROOT, '.cache/cards2027')
const FULL_WIDTH = 1600
const THUMB_WIDTH = 400

await mkdir(join(OUT_DIR, 'thumb'), { recursive: true })
await mkdir(join(SHEET_DIR, 'svg'), { recursive: true })

const only = process.argv.slice(2)
const cards = CZ_2027_CARDS.filter((c) => !c.imageSet).filter(
  (c) => only.length === 0 || only.includes(c.code),
)
const missing = cards.filter((c) => !DRAWINGS[c.code]).map((c) => c.code)
if (missing.length > 0) throw new Error(`No drawing for ${missing.join(', ')}`)

for (const c of cards) {
  const svg = card(c.code, c.name, DRAWINGS[c.code]!())
  await writeFile(join(SHEET_DIR, 'svg', `${c.image}.svg`), svg)
  const png = await sharp(Buffer.from(svg), { density: 72 }).png().toBuffer()
  await sharp(png)
    .resize({ width: FULL_WIDTH })
    .webp({ quality: 85 })
    .toFile(join(OUT_DIR, `${c.image}.webp`))
  await sharp(png)
    .resize({ width: THUMB_WIDTH })
    .webp({ quality: 80 })
    .toFile(join(OUT_DIR, 'thumb', `${c.image}.webp`))
}

const sheet = `<!doctype html><meta charset="utf-8"><title>ROTA 2027 cards</title>
<style>body{font-family:sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px;background:#eee}
img{width:100%;display:block;background:#fff}</style>
${cards.map((c) => `<figure><img src="../../apps/web/public/cards/cz-2027/${c.image}.webp"><figcaption>${c.code}</figcaption></figure>`).join('\n')}`
await writeFile(join(SHEET_DIR, 'sheet.html'), sheet)
console.log(`${cards.length} cards → ${OUT_DIR}`)

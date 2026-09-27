/**
 * Card image pipeline (plan §4): PDF pages → trimmed card images (webp, full + thumb)
 * in apps/web/public/cards/<ruleset>/, plus a contact sheet for a human review pass.
 *
 *   bun run cards:extract            # all sources
 *   bun run cards:extract --only cz  # one ruleset
 *
 * Needs poppler (`pdftoppm`, `pdfinfo`) and tesseract on PATH — `brew install poppler
 * tesseract`. Source PDFs live in podklady/ (not committed). Work files go to
 * .cache/cards/ — keep them inside the project: the sandboxed tooling cannot read /tmp.
 */
import { $ } from 'bun'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

import { cardFileName, SOURCES, VERIFIED_BY_EYE, type PageEntry, type Source } from './sources'

const RENDER_DPI = 200
const FULL_WIDTH = 1600
const THUMB_WIDTH = 400
const WORK_DIR = '.cache/cards'
const OUT_DIR = 'apps/web/public/cards'

type Result = {
  source: Source
  page: number
  entry: PageEntry
  file: string
  framed: boolean
  ocr: string | null
  ok: boolean
  bytes: number
}

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined

async function pageCount(pdf: string): Promise<number> {
  const info = await $`pdfinfo ${pdf}`.text()
  const match = /Pages:\s+(\d+)/.exec(info)
  if (!match) throw new Error(`Cannot read page count of ${pdf}`)
  return Number(match[1])
}

async function renderPage(pdf: string, page: number, base: string): Promise<string> {
  await $`pdftoppm -f ${page} -l ${page} -r ${RENDER_DPI} -png -singlefile ${pdf} ${base}`.quiet()
  return `${base}.png`
}

/**
 * Most national cards sit inside a thin printed frame (the cutting line) with a white
 * margin around it; some fill the whole page. Find the frame and crop to it; no frame on
 * all four sides → keep the page as it is. Trimming plain whitespace instead would crop
 * frameless cards to their artwork and change their proportions.
 *
 * A frame edge is an **unbroken** line across most of the card near the page edge. The
 * "unbroken" part matters: a row through bold text or a column along a coloured box can
 * be half dark too, but text has gaps between letters and boxes stop short. Probe at full
 * resolution — the frame is a thin light-grey hairline that vanishes when downscaled.
 */
async function frameBox(png: string) {
  const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const dark = (x: number, y: number) => (data[y * width + x] ?? 255) < 200
  const longestRun = (length: number, isDark: (i: number) => boolean) => {
    let best = 0
    let run = 0
    for (let i = 0; i < length; i++) {
      run = isDark(i) ? run + 1 : 0
      if (run > best) best = run
    }
    return best / length
  }
  const rowLine = (y: number) => longestRun(width, (x) => dark(x, y)) > 0.7
  const colLine = (x: number) => longestRun(height, (y) => dark(x, y)) > 0.7
  const edge = (from: number, to: number, isLine: (i: number) => boolean) => {
    const step = from < to ? 1 : -1
    for (let i = from; i !== to; i += step) if (isLine(i)) return i
    return null
  }
  const top = edge(0, Math.round(height * 0.2), rowLine)
  const bottom = edge(height - 1, Math.round(height * 0.8), rowLine)
  const left = edge(0, Math.round(width * 0.2), colLine)
  const right = edge(width - 1, Math.round(width * 0.8), colLine)
  if (top === null || bottom === null || left === null || right === null) return null
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

/** Read the code printed in the card's top-right corner. */
async function readCode(card: sharp.Sharp, base: string): Promise<string> {
  const { width = 0, height = 0 } = await card.metadata()
  const crop = `${base}-code.png`
  await card
    .clone()
    .extract({
      left: Math.round(width * 0.72),
      top: Math.round(height * 0.02),
      width: Math.round(width * 0.26),
      height: Math.round(height * 0.14),
    })
    .greyscale()
    .resize({ width: Math.round(width * 0.26 * 2) })
    .threshold(150)
    .toFile(crop)
  // Try a single-line read first, then block and sparse-text modes; the code sits
  // next to artwork on some cards and one mode alone misses it.
  const reads: string[] = []
  for (const psm of ['7', '6', '11']) {
    reads.push((await $`tesseract ${crop} - --psm ${psm}`.quiet().nothrow().text()).trim())
  }
  return reads.filter(Boolean).join(' | ')
}

/**
 * OCR tolerance: the digit 0 in `D0a` reads as the letter O, `Z` as `2`, dashes vary.
 * Only used to compare against the expected code, never to name anything.
 */
const normalise = (s: string) =>
  s
    .replace(/\s+/g, '')
    .replace(/[–—]/g, '-')
    .replace(/D[O0]{1,2}(?=[a-d])/g, 'D0')
    .replace(/(^|[^0-9])2-0/g, '$1Z-0')

async function processPage(source: Source, page: number, entry: PageEntry): Promise<Result> {
  const workDir = join(WORK_DIR, source.ruleset)
  const outDir = join(OUT_DIR, source.ruleset)
  const name = cardFileName(entry)
  const base = join(workDir, name)

  const png = await renderPage(source.pdf, page, base)
  const box = await frameBox(png)
  // Materialise the crop: `metadata()` on a pipeline reports the *input* size, and
  // `readCode` needs the cropped one.
  const card = sharp(await (box ? sharp(png).extract(box) : sharp(png)).png().toBuffer())

  // Only cards with a printed code can be checked; START/FINISH and diagrams have none.
  const checkable = entry.kind === 'card' && entry.code !== 'START' && entry.code !== 'FINISH'
  const ocr = checkable ? await readCode(card, base) : null
  const ok = ocr === null || normalise(ocr).includes(entry.code) || VERIFIED_BY_EYE.has(entry.code)

  const full = await card
    .clone()
    .resize({ width: FULL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
  await writeFile(join(outDir, `${name}.webp`), full)
  await card
    .clone()
    .resize({ width: THUMB_WIDTH })
    .webp({ quality: 75 })
    .toFile(join(outDir, 'thumb', `${name}.webp`))

  return { source, page, entry, file: name, framed: box !== null, ocr, ok, bytes: full.length }
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++
        results[i] = await fn(items[i] as T)
      }
    }),
  )
  return results
}

function contactSheet(results: Result[]): string {
  const cells = results
    .map((r) => {
      const label = `${r.entry.kind === 'diagram' ? `${r.entry.code} (nákres)` : r.entry.code}`
      const src = `../../${OUT_DIR}/${r.source.ruleset}/thumb/${r.file}.webp`
      const note = r.ocr === null ? '' : ` · OCR: ${r.ocr}`
      return `<figure class="${r.ok ? '' : 'bad'}"><img src="${src}" loading="lazy"><figcaption><b>${label}</b> · ${r.source.pdf.split('/').pop()} p.${r.page}${r.framed ? '' : ' · no frame'}${note}</figcaption></figure>`
    })
    .join('\n')
  return `<!doctype html><meta charset="utf-8"><title>ROTA cards</title>
<style>body{font:13px system-ui;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
figure{margin:0;border:1px solid #ddd;padding:6px}figure.bad{border:3px solid red}img{width:100%;display:block}</style>
<h1>ROTA — ${results.length} images, ${results.filter((r) => !r.ok).length} OCR mismatches</h1><main>${cells}</main>`
}

async function main() {
  const sources = SOURCES.filter((s) => !only || s.ruleset === only)
  for (const ruleset of new Set(sources.map((s) => s.ruleset))) {
    await rm(join(OUT_DIR, ruleset), { recursive: true, force: true })
    await mkdir(join(OUT_DIR, ruleset, 'thumb'), { recursive: true })
    await mkdir(join(WORK_DIR, ruleset), { recursive: true })
  }

  const jobs: { source: Source; page: number; entry: PageEntry }[] = []
  for (const source of sources) {
    const count = await pageCount(source.pdf)
    if (count !== source.pages.length) {
      throw new Error(`${source.pdf}: ${count} pages, sources.ts lists ${source.pages.length}`)
    }
    source.pages.forEach((entry, i) => jobs.push({ source, page: i + 1, entry }))
  }

  const results = await pool(jobs, 6, (j) => processPage(j.source, j.page, j.entry))
  await writeFile(join(WORK_DIR, 'contact-sheet.html'), contactSheet(results))

  const bad = results.filter((r) => !r.ok)
  const total = results.reduce((sum, r) => sum + r.bytes, 0)
  console.log(`${results.length} images, full size total ${(total / 1024 / 1024).toFixed(1)} MB`)
  console.log(
    `frameless pages: ${
      results
        .filter((r) => !r.framed)
        .map((r) => r.file)
        .join(', ') || 'none'
    }`,
  )
  console.log(`contact sheet: ${join(WORK_DIR, 'contact-sheet.html')}`)
  if (bad.length) {
    console.log(`\n${bad.length} pages whose printed code was not read as expected — check them:`)
    for (const r of bad)
      console.log(`  ${r.source.pdf} p.${r.page}: expected ${r.entry.code}, OCR "${r.ocr}"`)
  }
}

await main()

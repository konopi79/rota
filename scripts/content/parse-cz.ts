/**
 * Draft extraction of the national cards from the regulation text (plan §4, R1):
 * podklady/2026nzr-ro-cz-final.pdf, annex 1 ("Příloha 1: Popis cviků") → a draft JSON of
 * every card with its type, name, description, sub-part table and sequencing hints.
 *
 *   bun run scripts/content/parse-cz.ts   → .cache/content/cz-draft.json
 *
 * The output is a **draft for proofreading**, not data: PDF text extraction breaks table
 * cells over lines and loses layout. The proofread result lives in
 * packages/content/src/cz/cards.ts. Re-run this when a new version of the regulation
 * comes out and diff the draft against the previous one to see what changed.
 */
import { $ } from 'bun'
import { mkdir, writeFile } from 'node:fs/promises'

const PDF = 'podklady/2026nzr-ro-cz-final.pdf'
const OUT = '.cache/content/cz-draft.json'
const FOOTER = /Zkušební řád Rally Obedience v ČR, 2026/

type Draft = {
  code: string
  typeRaw: string
  name: string
  description: string[]
  subParts: { text: string; main: boolean }[]
  page: number
  hints: {
    requiresSupplementary: boolean
    nextOneOf: string[]
    afterStatic: boolean
    equipment: string[]
  }
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()
const normaliseCode = (s: string) => s.replace(/[–—]/g, '-')

/** `3–302 a D0a–d, 2–215` → `['3-302', '2-215']` (D0 pairing is implied by the card). */
const codesIn = (s: string) =>
  [...normaliseCode(s).matchAll(/\b(Z-0\d{2}|[123]-\d{3})\b/g)].map((m) => m[1] as string)

async function main() {
  const text = await $`pdftotext -layout ${PDF} -`.text()
  const all = text.split('\n')
  // The table of contents repeats the headings — take the last occurrence.
  const start = all.findLastIndex((l) => /^8\.1\.1\.1\s/.test(l))
  const end = all.findLastIndex((l) => /^8\.1\.2 RO-V/.test(l))
  const lines = all.slice(start, end)

  // Page of each line: the page number sits on the line just above the footer.
  const pageOf: number[] = new Array(lines.length)
  let pending: number[] = []
  let lastNumber = 0
  lines.forEach((line, i) => {
    const num = /^\s*(\d{1,3})\s*$/.exec(line)
    if (num) lastNumber = Number(num[1])
    if (FOOTER.test(line)) {
      for (const j of pending) pageOf[j] = lastNumber
      pending = []
    } else pending.push(i)
  })
  for (const j of pending) pageOf[j] = lastNumber + 1

  const header = /^\s*((?:Z|[123])?[-–]\d{3}|D0[a-d])\s+Typ\s*(.*)$/
  const isNoise = (l: string) =>
    FOOTER.test(l) || /^\s*\d{1,3}\s*$/.test(l) || /^8\.1\.1\.\d/.test(l)

  const cards: Draft[] = []
  let i = 0
  while (i < lines.length) {
    const m = header.exec(lines[i] ?? '')
    if (!m) {
      i++
      continue
    }
    let code = normaliseCode(m[1] as string)
    // One header lost its leading class digit in the PDF (`-309`): infer it.
    if (code.startsWith('-')) code = `${code[1]}${code}`
    const page = pageOf[i] ?? 0
    const body: string[] = []
    i++
    while (i < lines.length && !header.exec(lines[i] ?? '')) {
      if (!isNoise(lines[i] ?? '')) body.push(lines[i] ?? '')
      i++
    }

    const tableAt = body.findIndex((l) => /Dílčí část\s+Hlavní cvik/.test(l))
    const pre = (tableAt >= 0 ? body.slice(0, tableAt) : body).map((l) => l.trim())
    const table = tableAt >= 0 ? body.slice(tableAt + 1) : []

    // Name: first meaningful line, plus continuation lines that start in lower case.
    const content = pre.filter((l) => l && l !== 'Doplňková karta')
    let name = (content.shift() ?? '').replace(/^[a-d]\)\s*/, '')
    while (content[0] && /^[a-zěščřžýáíéůú]/.test(content[0])) name += ` ${content.shift()}`

    // Description: paragraphs split where a line ends a sentence and a blank line follows.
    const description: string[] = []
    let current = ''
    const rest = pre.slice(
      pre.indexOf(content[0] ?? '') >= 0 ? pre.indexOf(content[0] ?? '') : pre.length,
    )
    for (const line of rest) {
      if (!line) {
        if (/[.:]$/.test(current)) {
          description.push(collapse(current))
          current = ''
        }
        continue
      }
      current += ` ${line}`
    }
    if (collapse(current)) description.push(collapse(current))

    const subParts = table
      .map((l) => l.trimEnd())
      .filter((l) => l.trim())
      .map((l) => {
        const main = /\s{3,}[xX]$/.test(l)
        return { text: collapse(main ? l.replace(/[xX]$/, '') : l), main }
      })

    const joined = collapse(body.join(' '))
    const nextOneOf = [
      ...joined.matchAll(
        /(?:Další cvik v parkuru musí být vybrán z těchto karet|Způsob přivolání přes překážku určují karty|Pro třídu RO3 je možné použít i tyto karty):([^.]*)\./g,
      ),
    ].flatMap((x) => codesIn(x[1] as string))

    cards.push({
      code,
      typeRaw: collapse(m[2] as string),
      name: collapse(name),
      description,
      subParts,
      page,
      hints: {
        requiresSupplementary: /doplňkovou kartu D0a/.test(joined),
        nextOneOf: [...new Set(nextOneOf)],
        afterStatic: /statickým cvikem \(typ A\)/.test(joined),
        equipment: [
          /kuže/i.test(joined) && 'cones',
          /misk/i.test(joined) && 'bowls',
          /překážk/i.test(joined) && 'jump',
        ].filter(Boolean) as string[],
      },
    })
  }

  await mkdir('.cache/content', { recursive: true })
  await writeFile(OUT, JSON.stringify(cards, null, 2))
  console.log(`${cards.length} cards → ${OUT}`)
}

await main()

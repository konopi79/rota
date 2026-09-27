/**
 * Draft extraction of the FCI cards from the Czech translation of the FCI rules (R2):
 * podklady/ouk-cz-fci_ro_regulations_and_guidelines_01-02-2025.pdf, §5 "Popis karet /
 * cviků" → a draft JSON with code, points, type, English and Czech name, description.
 *
 *   bun run scripts/content/parse-fci.ts   → .cache/content/fci-draft.json
 *
 * Same contract as parse-cz.ts: a **draft for proofreading**. This PDF also carries
 * tracked changes — check it with scripts/content/strikethrough.py.
 */
import { $ } from 'bun'
import { mkdir, writeFile } from 'node:fs/promises'

const PDF = 'podklady/ouk-cz-fci_ro_regulations_and_guidelines_01-02-2025.pdf'
const OUT = '.cache/content/fci-draft.json'
const FOOTER = /Zkušební řád & Směrnice pro Mezinárodní soutěže FCI Rally Obedience\s+(\d+) \/ 36/

type Draft = {
  code: string
  points: number
  type: string
  nameEn: string
  name: string
  description: string[]
  page: number
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

async function main() {
  const lines = (await $`pdftotext -layout ${PDF} -`.text()).split('\n')
  const start = lines.findLastIndex((l) => /^5\.1\. Jednobodové karty/.test(l.trim()))
  const end = lines.findLastIndex((l) => /^6\.\s+POKYNY PRO POSUZOVÁNÍ/.test(l.trim()))
  const section = lines.slice(start, end)

  // Page of each line: the footer ("… 19 / 36") closes a page.
  const pageOf: number[] = []
  let pending: number[] = []
  section.forEach((line, i) => {
    const footer = FOOTER.exec(line)
    if (footer) {
      for (const j of pending) pageOf[j] = Number(footer[1])
      pending = []
    } else pending.push(i)
  })
  for (const j of pending) pageOf[j] = (pageOf[pending[0]! - 1] ?? 0) + 1

  const isNoise = (l: string) =>
    FOOTER.test(l) || /^\s*5\.\d\./.test(l) || /^\s*KARTA\s+POPIS\s*$/.test(l)
  const headerStart = /^\s+([1-4]\d{2}) ([A-Z0-9°º].*)$/

  const cards: Draft[] = []
  let i = 0
  while (i < section.length) {
    const m = headerStart.exec(section[i] ?? '')
    if (!m) {
      i++
      continue
    }
    const code = m[1] as string
    const page = pageOf[i] ?? 0
    // The header can wrap: "315 STOP, SIDE SHIFT BEHIND, STOP (A) - STOP, ZMĚNA STRANY ZA"
    // + "PSOVODEM (A)". Continuation lines are all upper case and never start with a code.
    let header = m[2] as string
    i++
    const upper = /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ0-9°º ,.\-–()x/&]+$/
    while (i < section.length) {
      const next = (section[i] ?? '').trim()
      if (!next || !upper.test(next) || headerStart.test(section[i] ?? '')) break
      header += ` ${next}`
      i++
    }
    // English (place) [-–] Czech (place) — the letter is where the exercise is done (§4.3); the separator or the Czech type is sometimes missing.
    const parts = /^(.*?)\s*\(([A-D])\)\s*[-–]?\s*(.*?)\s*(?:\(([A-D])\))?\s*$/.exec(
      collapse(header),
    )
    const body: string[] = []
    while (i < section.length && !headerStart.exec(section[i] ?? '')) {
      if (!isNoise(section[i] ?? '')) body.push((section[i] ?? '').trim())
      i++
    }
    const description: string[] = []
    let current = ''
    for (const line of body) {
      if (!line) {
        if (collapse(current)) description.push(collapse(current))
        current = ''
      } else current += ` ${line}`
    }
    if (collapse(current)) description.push(collapse(current))

    cards.push({
      code,
      points: Number(code[0]),
      type: parts ? (parts[2] as string) : '?',
      nameEn: parts ? (parts[1] as string) : collapse(header),
      name: parts?.[3] || '?',
      description,
      page,
    })
  }

  await mkdir('.cache/content', { recursive: true })
  await writeFile(OUT, JSON.stringify(cards, null, 2))
  console.log(`${cards.length} cards → ${OUT}`)
}

await main()

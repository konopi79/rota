/**
 * ROTA's own card graphics (plan R23): until the Czech club's 2027 cards, a new or rewritten 2027
 * card gets a card of ours — not a copy of the VDH, national or FCI cards (the author,
 * 2026-11-06: "něco mezi FCI a národním řádem, ať to víc připomíná kartu"). The language of a
 * rally card — a big arrow for the team's way, the name below, the code top right — in shapes and
 * colours of our own: a navy arrow outlined in teal, rounded badges for the dog's position and a
 * stop, the dog's own way dashed.
 *
 * Coordinates are the card's, 1600 × 1132 (the national images' size), y down; a heading is in
 * degrees, 0 up the card, positive turning right.
 */

export const W = 1600
export const H = 1132
export const NAVY = '#1f3b57'
export const TEAL = '#2a9d8f'
export const CORAL = '#e4572e'
export const CONE = '#f28c28'
const GREY = '#9aa5b1'
const FONT = 'Helvetica, Arial, sans-serif'

export type Point = { x: number; y: number }

const rad = (deg: number) => (deg * Math.PI) / 180
const dirOf = (heading: number): Point => ({
  x: Math.sin(rad(heading)),
  y: -Math.cos(rad(heading)),
})
/** The unit vector to the right of a heading. */
const rightOf = (heading: number): Point => ({
  x: Math.cos(rad(heading)),
  y: Math.sin(rad(heading)),
})
const add = (p: Point, v: Point, k = 1): Point => ({ x: p.x + v.x * k, y: p.y + v.y * k })
const n = (v: number) => Math.round(v * 10) / 10

/**
 * A way drawn like a turtle walks: straight on, turning in arcs (`turn(90, 60)` right, a negative
 * angle left) or sideways without turning (`side`). It keeps samples along the way, so marks can be
 * put at a distance along it (`at`).
 */
export class Way {
  private d: string
  private p: Point
  private h: number
  private samples: { p: Point; h: number; s: number }[]
  private s = 0

  constructor(x: number, y: number, heading = 0) {
    this.p = { x, y }
    this.h = heading
    this.d = `M ${n(x)} ${n(y)}`
    this.samples = [{ p: this.p, h: heading, s: 0 }]
  }

  get end() {
    return { ...this.p, heading: this.h }
  }

  get length() {
    return this.s
  }

  fwd(len: number) {
    this.p = add(this.p, dirOf(this.h), len)
    this.s += len
    this.d += ` L ${n(this.p.x)} ${n(this.p.y)}`
    this.samples.push({ p: this.p, h: this.h, s: this.s })
    return this
  }

  /** Turns `angle` degrees (positive right) on an arc of `radius`. */
  turn(angle: number, radius: number) {
    const pieces = Math.ceil(Math.abs(angle) / 90)
    const step = angle / pieces
    for (let i = 0; i < pieces; i++) this.arc(step, radius)
    return this
  }

  private arc(angle: number, radius: number) {
    const side = Math.sign(angle)
    const centre = add(this.p, rightOf(this.h), side * radius)
    const from = this.h
    const to = this.h + angle
    // Samples every few degrees, for `at`.
    const k = Math.max(2, Math.ceil(Math.abs(angle) / 5))
    for (let i = 1; i <= k; i++) {
      const h = from + (angle * i) / k
      const p = add(centre, rightOf(h), -side * radius)
      this.samples.push({ p, h, s: this.s + (Math.abs(rad(angle)) * radius * i) / k })
    }
    this.s += Math.abs(rad(angle)) * radius
    this.h = to
    this.p = add(centre, rightOf(to), -side * radius)
    this.d += ` A ${radius} ${radius} 0 0 ${angle > 0 ? 1 : 0} ${n(this.p.x)} ${n(this.p.y)}`
  }

  /** A step sideways, the heading kept: `dx` to the right (negative left). */
  side(dx: number) {
    this.p = add(this.p, rightOf(this.h), dx)
    this.d += ` L ${n(this.p.x)} ${n(this.p.y)}`
    this.samples.push({ p: this.p, h: this.h, s: this.s })
    return this
  }

  /** The point and heading `s` along the way. */
  at(s: number): { p: Point; h: number } {
    const i = this.samples.findIndex((x) => x.s >= s)
    if (i <= 0) return this.samples[i === 0 ? 0 : this.samples.length - 1]!
    const a = this.samples[i - 1]!
    const b = this.samples[i]!
    const t = b.s === a.s ? 1 : (s - a.s) / (b.s - a.s)
    return { p: { x: a.p.x + (b.p.x - a.p.x) * t, y: a.p.y + (b.p.y - a.p.y) * t }, h: b.h }
  }

  get path() {
    return this.d
  }

  /** The start `back` behind where it is: an outline must cover the arrow's tail too. */
  pathFromBehind(back: number) {
    const s = this.samples[0]!
    const b = add(s.p, dirOf(s.h), -back)
    return this.d.replace(/^M [^L]+/, `M ${n(b.x)} ${n(b.y)} L ${n(s.p.x)} ${n(s.p.y)} `)
  }
}

const OUTLINE = 10

/** The team's way: a navy arrow outlined in teal, as wide as `width`. */
export function arrow(way: Way, width = 150, head = true): string {
  const e = way.end
  const half = width * 0.95
  const len = width * 1.15
  const tip = add(e, dirOf(e.heading), len)
  const a = add(e, rightOf(e.heading), half)
  const b = add(e, rightOf(e.heading), -half)
  const tri = `M ${n(a.x)} ${n(a.y)} L ${n(tip.x)} ${n(tip.y)} L ${n(b.x)} ${n(b.y)} Z`
  const into = add(e, dirOf(e.heading), 4)
  const shaft = `${way.path} L ${n(into.x)} ${n(into.y)}`
  return [
    `<path d="${way.pathFromBehind(OUTLINE)}${head ? '' : ` L ${n(add(e, dirOf(e.heading), OUTLINE).x)} ${n(add(e, dirOf(e.heading), OUTLINE).y)}`}" fill="none" stroke="${TEAL}" stroke-width="${width + 2 * OUTLINE}" stroke-linejoin="round"/>`,
    head
      ? `<path d="${tri}" fill="${TEAL}" stroke="${TEAL}" stroke-width="${2 * OUTLINE}" stroke-linejoin="round"/>`
      : '',
    head ? `<path d="${tri}" fill="${NAVY}"/>` : '',
    `<path d="${shaft}" fill="none" stroke="${NAVY}" stroke-width="${width}" stroke-linejoin="round"/>`,
  ].join('\n')
}

/** The dog's own way: dashed teal with a filled head. */
export function dogWay(way: Way, width = 16): string {
  const e = way.end
  const half = width * 2.2
  const len = width * 3.2
  const tip = add(e, dirOf(e.heading), len)
  const a = add(e, rightOf(e.heading), half)
  const b = add(e, rightOf(e.heading), -half)
  return [
    `<path d="${way.path}" fill="none" stroke="#ffffff" stroke-width="${width + 12}" stroke-linejoin="round" stroke-linecap="round"/>`,
    `<path d="${way.path}" fill="none" stroke="${TEAL}" stroke-width="${width}" stroke-dasharray="${width * 2} ${width * 1.4}" stroke-linejoin="round"/>`,
    `<path d="M ${n(a.x)} ${n(a.y)} L ${n(tip.x)} ${n(tip.y)} L ${n(b.x)} ${n(b.y)} Z" fill="${TEAL}" stroke="${TEAL}" stroke-width="6" stroke-linejoin="round"/>`,
  ].join('\n')
}

/** White chevrons on the arrow, `s` along the way, showing which way it goes round a loop. */
export function chevrons(way: Way, at: number[], width = 150): string {
  return at
    .map((s) => {
      const { p, h } = way.at(s)
      const k = width * 0.22
      return `<path d="M ${-k} ${k * 0.5} L 0 ${-k * 0.5} L ${k} ${k * 0.5}" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(h)})"/>`
    })
    .join('\n')
}

/** A step: its number in a teal circle on the arrow, `s` along the way (no footprints — the author). */
export function step(way: Way, s: number, label: string): string {
  const { p } = way.at(s)
  return [
    `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="40" fill="${TEAL}" stroke="#ffffff" stroke-width="6"/>`,
    text(label, p.x, p.y + 19, 54, '#ffffff'),
  ].join('\n')
}

export function text(
  s: string,
  x: number,
  y: number,
  size: number,
  fill = NAVY,
  anchor: 'start' | 'middle' | 'end' = 'middle',
): string {
  return `<text x="${n(x)}" y="${n(y)}" font-family="${FONT}" font-weight="700" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${escape(s)}</text>`
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export type Position = 'sit' | 'down' | 'stand'
const POSITION_WORD: Record<Position, string> = { sit: 'SEDNI', down: 'LEHNI', stand: 'STŮJ' }

/**
 * A teal badge with the dog's position as a word filling it (the author, 2026-11-06: no dog
 * drawn), its top left at `x`, `y`.
 */
export function position(p: Position, x: number, y: number, word = POSITION_WORD[p]): string {
  return badge(word, x, y)
}

/** A teal badge with a word as big as it fits. */
export function badge(word: string, x: number, y: number, w = BADGE.w, h = BADGE.h): string {
  const size = Math.min(h * 0.6, (w - 50) / (word.length * 0.66))
  return `<g transform="translate(${n(x)} ${n(y)})">
    <rect width="${w}" height="${h}" rx="36" fill="${TEAL}"/>
    ${text(word, w / 2, h / 2 + size * 0.36, n(size), '#ffffff')}
  </g>`
}

export const BADGE = { w: 340, h: 170 }

/** A stop: a coral rounded square — not the octagon of the official cards. */
export function stop(x: number, y: number, size = 190): string {
  return `<g transform="translate(${n(x)} ${n(y)})">
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${CORAL}"/>
    <rect x="10" y="10" width="${size - 20}" height="${size - 20}" rx="${size * 0.16}" fill="none" stroke="#ffffff" stroke-width="6"/>
    ${text('STOP', size / 2, size / 2 + size * 0.1, size * 0.27, '#ffffff')}
  </g>`
}

/** A cone seen from above. */
export function cone(x: number, y: number, r = 34): string {
  return `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${CONE}" stroke="#ffffff" stroke-width="6"/>
    <circle cx="${n(x)}" cy="${n(y)}" r="${r * 0.35}" fill="#ffffff"/>`
}

/** A bar jump seen from above, `heading` the way over it. */
export function jump(x: number, y: number, heading = 0, width = 260): string {
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${heading})">
    <rect x="${-width / 2}" y="-9" width="${width}" height="18" rx="4" fill="${CONE}"/>
    <rect x="${-width / 2 - 14}" y="-24" width="28" height="48" rx="6" fill="${NAVY}"/>
    <rect x="${width / 2 - 14}" y="-24" width="28" height="48" rx="6" fill="${NAVY}"/>
  </g>`
}

/** A small rounded label, e.g. "výměna strany", centred on `x`, `y`. */
export function chip(label: string, x: number, y: number, size = 56): string {
  const w = label.length * size * 0.6 + size
  const h = size * 1.6
  return `<g transform="translate(${n(x - w / 2)} ${n(y - h / 2)})">
    <rect width="${n(w)}" height="${n(h)}" rx="${n(h / 2)}" fill="#ffffff" stroke="${TEAL}" stroke-width="5"/>
    ${text(label, w / 2, h / 2 + size * 0.36, size)}
  </g>`
}

/** The name at the bottom, on one line or two (split at a dash) when it is long. */
function title(name: string): string {
  const max = W - 160
  const one = Math.min(80, max / (name.length * 0.56))
  if (one >= 66) return text(name, W / 2, 990, n(one))
  const parts = name.split(' – ')
  let best = [name, '']
  let bestDiff = Infinity
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join(' – ') + ' –'
    const b = parts.slice(i).join(' – ')
    const diff = Math.abs(a.length - b.length)
    if (diff < bestDiff) [best, bestDiff] = [[a, b], diff]
  }
  const size = Math.min(70, max / (Math.max(best[0]!.length, best[1]!.length) * 0.56))
  return [
    text(best[0]!, W / 2, 945, n(size)),
    text(best[1]!, W / 2, 945 + size * 1.1, n(size)),
  ].join('\n')
}

/**
 * Why the card is ours (the author, 2026-11-06): until the official Czech 2027 cards, or VDH's
 * consent to use its cards, ROTA shows its own take on them.
 */
const NOTE = [
  'Neoficiální karta ROTA – naše vlastní ztvárnění cviku podle řádu 2027.',
  'Používáme ji, dokud nevyjdou oficiální české karty nebo nezískáme souhlas s použitím karet VDH.',
]

/** The whole card: frame, code, the drawing, the name and our mark. */
export function card(code: string, name: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="34" fill="#ffffff" stroke="${NAVY}" stroke-width="8"/>
  ${text(code, 1530, 105, 66, NAVY, 'end')}
  ${body}
  ${title(name)}
  ${NOTE.map((line, i) => `<text x="${W / 2}" y="${1068 + i * 34}" font-family="${FONT}" font-size="27" fill="${GREY}" text-anchor="middle">${escape(line)}</text>`).join('\n  ')}
</svg>`
}

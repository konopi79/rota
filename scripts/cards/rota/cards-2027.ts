/**
 * The drawings of ROTA's own 2027 cards (plan R23): the new cards and the two codes that mean
 * another exercise in 2027 (1-116, 3-302) — those with no 2026 image to show. Each drawing is a
 * sketch of the exercise from the card's text (`packages/content/src/cz-2027/`), the team
 * walking up the card; the name comes from the card data.
 */
import {
  arrow,
  BADGE,
  badge,
  chevrons,
  chip,
  cone,
  dogWay,
  jump,
  position,
  type Position,
  step,
  stop,
  text,
  Way,
} from './draw'

/** A badge centred on `x`, `y`. */
const pos = (p: Position, x: number, y: number) => position(p, x - BADGE.w / 2, y - BADGE.h / 2)
const stopAt = (x: number, y: number, size = 190) => stop(x - size / 2, y - size / 2, size)

/** 1-127–1-130: out of the walk 90° in one foot movement, two steps, a position. */
function turnTwoSteps(right: boolean, p: Position): string {
  const k = right ? 1 : -1
  const x0 = right ? 470 : 1130
  const way = new Way(x0, 870, 0)
    .fwd(380)
    .turn(90 * k, 80)
    .fwd(420)
  const bend = 380 + (Math.PI / 2) * 80
  return [
    arrow(way),
    step(way, bend + 130, '1'),
    step(way, bend + 300, '2'),
    text('90°', x0 + k * 230, 720, 120),
    pos(p, right ? 1365 : 235, way.end.y),
  ].join('\n')
}

/** Z-033 / Z-034: 90° one way, two steps, 90° back. */
function zigzag(right: boolean): string {
  const k = right ? 1 : -1
  const way = new Way(800 - k * 260, 880, 0)
    .fwd(190)
    .turn(90 * k, 80)
    .fwd(360)
    .turn(-90 * k, 80)
    .fwd(150)
  const s = 190 + (Math.PI / 2) * 80
  return [arrow(way), step(way, s + 110, '1'), step(way, s + 260, '2')].join('\n')
}

/** Z-035, 1-116: a position or a stop, one step forward, a position. */
function oneStep(start: string, end: Position): string {
  const way = new Way(560, 470, 90).fwd(330)
  return [arrow(way), step(way, 165, '1'), start, pos(end, 1290, 470)].join('\n')
}

export const DRAWINGS: Record<string, () => string> = {
  'Z-033': () => zigzag(true),
  'Z-034': () => zigzag(false),
  'Z-035': () => oneStep(stopAt(310, 470, 230), 'down'),
  'Z-036': () => {
    const team = new Way(900, 800, 0).fwd(220).turn(-180, 110).fwd(150)
    const dog = new Way(760, 800, 0).fwd(160).turn(180, 190).fwd(120)
    return [text('2×', 330, 600, 200), arrow(team, 130), dogWay(dog)].join('\n')
  },
  '1-116': () => oneStep(pos('stand', 330, 470), 'stand'),
  '1-126': () => {
    const way = new Way(740, 880, 0)
      .fwd(290)
      .turn(90, 100)
      .fwd(60)
      .turn(-360, 160)
      .fwd(60)
      .turn(90, 100)
      .fwd(140)
    const loop = 290 + (Math.PI / 2) * 100 + 60
    return [
      arrow(way, 110),
      cone(900, 330),
      cone(900, 650),
      chevrons(way, [loop + 250, loop + 500, loop + 760], 110),
      chip('výměna strany', 400, 490),
    ].join('\n')
  },
  '1-127': () => turnTwoSteps(true, 'down'),
  '1-128': () => turnTwoSteps(false, 'down'),
  '1-129': () => turnTwoSteps(true, 'stand'),
  '1-130': () => turnTwoSteps(false, 'stand'),
  '2-233': () => {
    const team = new Way(800, 880, 0).fwd(220)
    const dog = new Way(640, 540, 0)
      .fwd(310)
      .turn(180, 160)
      .fwd(450)
      .turn(90, 160)
      .turn(90, 160)
      .fwd(110)
    return [arrow(team, 120), cone(800, 230), dogWay(dog), pos('stand', 330, 560)].join('\n')
  },
  '2-234': () => {
    const way = new Way(960, 880, 0).fwd(260).side(-320).fwd(170)
    return [arrow(way), chip('úkrok', 1220, 560)].join('\n')
  },
  '3-302': () => {
    const team = new Way(1060, 840, 0).fwd(500)
    const dog = new Way(900, 850, 0).turn(-60, 160).turn(60, 160).fwd(420)
    return [jump(740, 560), jump(740, 300), arrow(team, 130), dogWay(dog)].join('\n')
  },
  '3-328': () => {
    const team = new Way(880, 820, 0).fwd(260).turn(180, 120).fwd(120)
    const dog = new Way(720, 820, 0).fwd(260).turn(-180, 120).fwd(120)
    return [arrow(team, 130), dogWay(dog)].join('\n')
  },
  '3-329': () => {
    const way = new Way(760, 880, 0).fwd(250).turn(35, 90).fwd(300)
    return [arrow(way), pos('stand', 420, 560)].join('\n')
  },
  '3-330': () => roundTheDog('sit'),
  '3-331': () => roundTheDog('down'),
  '3-332': () => roundTheDog('stand'),
  D0e: () => {
    const way = new Way(940, 170, 180).fwd(430).turn(180, 110).fwd(270)
    return [arrow(way, 130), badge('ZŮSTAŇ', 380 - BADGE.w / 2, 440 - BADGE.h / 2)].join('\n')
  },
}

/** 3-330–3-332: left on the move, the handler round it from the front back to heel. */
function roundTheDog(p: Position): string {
  const r = 230
  const way = new Way(560 + r, 880, 0).fwd(440).turn(-360, r).fwd(40)
  const s = 440
  return [
    arrow(way, 120),
    chevrons(way, [s + 360, s + 720, s + 1080], 120),
    pos(p, 560, 440),
    stopAt(1150, 300),
  ].join('\n')
}

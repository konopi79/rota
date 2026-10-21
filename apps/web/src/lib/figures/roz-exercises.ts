import type { Exercise } from './exercise'
import type { FootTarget } from './locomotion'

/**
 * RO-Z exercises as scripts. Each cites the regulation (Zkušební řád RO v ČR 2026,
 * appendix 1); timing and paths the text leaves open follow the Psí škola ABS overview
 * video (2024 rules, same cards).
 */

/**
 * Z-001 Stop: "Tým se zastaví u karty v místě pro provedení cviku a zaujme základní
 * pozici. (pes si může sednout sám či na povel)" — p. 18. In the video the dog sits about
 * half a second after the handler stops, the team holds the position for a moment and
 * walks on.
 */
export const Z001: Exercise = {
  code: 'Z-001',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 1.5, caption: 'basePosition' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * Z-002 Stop – lehni: "Tým se zastaví u karty v místě pro vykonání cviku a zaujme základní
 * pozici. Na povel psovoda si pes lehá." — p. 18; "po zaujetí každé pozice psovod stojí
 * vedle psa". In the video the dog lies down about a second after it sat, stays down for a
 * moment and the team walks on straight from the down.
 */
export const Z002: Exercise = {
  code: 'Z-002',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 0.6, caption: 'basePosition' },
    { dog: 'down', caption: 'down' },
    { wait: 1.2, caption: 'downHold' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * Z-003 Stop – lehni – sedni: "… Na povel psovoda si pes lehá. Na další povel psovoda si
 * pes sedá." — p. 19; "po zaujetí každé pozice psovod stojí vedle psa".
 */
export const Z003: Exercise = {
  code: 'Z-003',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 0.6, caption: 'basePosition' },
    { dog: 'down', caption: 'down' },
    { wait: 0.8, caption: 'downHold' },
    { dog: 'sit', caption: 'sitAgain' },
    { wait: 1, caption: 'basePosition' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * Z-004 Stop – okolo psa: "Psovod může dát povel k setrvání na místě a obejde sedícího psa
 * zepředu a zastaví se opět v základní pozici, kde krátce setrvá. Pes přitom nesmí změnit
 * polohu ani pozici." — p. 19. In the video the handler steps forward, crosses in front of
 * the dog, comes back behind it at a normal walk (about 3.5 s) and stands for a moment
 * before the team walks on.
 */
export const Z004: Exercise = {
  code: 'Z-004',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 0.8, caption: 'stay' },
    { around: 'dog', caption: 'aroundDog' },
    { wait: 1, caption: 'aroundDone' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * Z-005 Stop – lehni – okolo psa: "… Na povel psovoda si pes lehá. Psovod může dát povel
 * k setrvání na místě a obejde ležícího psa zepředu. Po obejití se zastaví vedle ležícího
 * psa a krátce v pozici setrvá." — p. 19.
 */
export const Z005: Exercise = {
  code: 'Z-005',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 0.6, caption: 'basePosition' },
    { dog: 'down', caption: 'down' },
    { wait: 0.6, caption: 'stayDown' },
    { around: 'dog', caption: 'aroundLyingDog' },
    { wait: 1, caption: 'aroundDoneDown' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * The 90° and 180° turns are walked in a small arc ("Obrat v malém oblouku je dovolen",
 * p. 21; the guidelines allow an arc in 006–009, p. 12, and příloha 2 docks "Příliš velké
 * oblouky v obratech"). No size is given: in the video the handler turns tightly right in
 * front of the card, about half a metre round for 90°, nearly on the spot for 180° —
 * walking back some 40 cm beside the way in. Turning to the dog's side, the dog turns
 * almost on the spot inside the arc.
 */
const ARC = { 90: 0.35, 180: 0.2 }

const turnWhileWalking = (
  code: string,
  turn: 90 | -90 | 180 | -180,
  caption: string,
): Exercise => ({
  code,
  card: 'ahead',
  steps: [
    { walk: 3.5, caption: 'approachTurn' },
    { turn, radius: ARC[Math.abs(turn) as 90 | 180], caption },
    { walk: 3, caption: 'leaveTurn' },
  ],
})

/** Z-006 Obrat vpravo za chůze: "Tým provede před kartou obrat vpravo o 90° a bez zastavení pokračuje dál." — p. 20. */
export const Z006 = turnWhileWalking('Z-006', 90, 'turnRight90')
/** Z-007 Obrat vlevo za chůze — p. 21. */
export const Z007 = turnWhileWalking('Z-007', -90, 'turnLeft90')
/** Z-008 Obrat zpět vpravo: "… obrat vpravo o 180° … Obrat v malém oblouku je dovolen." — p. 21. */
export const Z008 = turnWhileWalking('Z-008', 180, 'turnRight180')
/** Z-009 Obrat zpět vlevo — p. 21. */
export const Z009 = turnWhileWalking('Z-009', -180, 'turnLeft180')

/**
 * 270° and 360°: "psovod provádí obrat na místě. Lehké posuny nohou ve směru obratu jsou
 * povoleny. Pes během provádění cviku zůstává stále u nohy." — p. 22. The team slows down
 * into the turn; turning to the dog's side, the dog backs up and swings round at heel.
 */
const turnOnTheSpot = (
  code: string,
  turn: number,
  caption: string,
  card: 'side' | 'ahead',
): Exercise => ({
  code,
  card,
  steps: [
    { walk: 3.5, caption: card === 'ahead' ? 'approachTurn' : 'approach' },
    { turn, radius: 0, caption },
    { walk: 3, caption: card === 'ahead' ? 'leaveTurn' : 'leave' },
  ],
})

/** Z-011 270° vpravo — p. 22; a change of direction, so the card stands ahead. */
export const Z011 = turnOnTheSpot('Z-011', 270, 'turnRight270', 'ahead')
/** Z-012 270° vlevo — p. 22. */
export const Z012 = turnOnTheSpot('Z-012', -270, 'turnLeft270', 'ahead')
/**
 * Z-013 360° vpravo: "Tým provede v místě pro vykonání cviku obrat vpravo o 360° … Z pohledu
 * psovoda se nemění směr postupu." — p. 22: the usual place left in front of the card.
 */
export const Z013 = turnOnTheSpot('Z-013', 360, 'turnRight360', 'side')

/**
 * Z-014 Předsednutí with a supplementary card (p. 22): "V místě pro provedení cviku dává
 * psovod psovi povel k předsednutí. … Během předsednutí a během provádění cviku
 * z doplňkové karty nesmí psovod pohybovat nohama." The handler may step back up to four
 * times while the dog comes round — may, so here the handler stands. Then the D0 card
 * (p. 17): a) round the handler's right side into heel, sit; b) straight to the left leg,
 * sit; c), d) the same without sitting — level with the left leg, the team walks on. Timing
 * from the video: the dog in front about a second after the stop, sitting a second, round
 * the handler in about a second and a half.
 */
const frontAndFinish = (supplementary: 'D0a' | 'D0b' | 'D0c' | 'D0d'): Exercise => {
  const around = supplementary === 'D0a' || supplementary === 'D0c'
  const sits = supplementary === 'D0a' || supplementary === 'D0b'
  return {
    code: 'Z-014',
    supplementary,
    // The dog needs room in front: the handler stops in the middle of the square, further
    // back than usual, so the dog sitting in front is still in it (the author's suggestion,
    // instead of stepping back).
    stopAt: { x: 0.15, z: -0.45 },
    steps: [
      { walk: 3.5, caption: 'approach' },
      { stop: true, caption: 'frontCommand' },
      { dogPath: 'toFront', caption: 'toFront' },
      { dog: 'sit', caption: 'frontSit' },
      { wait: 1, caption: 'frontHold' },
      {
        dogPath: around ? 'aroundHandler' : 'toHeel',
        caption: around ? 'finishAround' : 'finishDirect',
      },
      ...(sits
        ? ([
            { dog: 'sit', caption: 'finishSit' },
            { wait: 1, caption: 'basePosition' },
            { walk: 3, caption: 'leave' },
          ] as const)
        : ([{ walk: 3, caption: 'leaveTogether' }] as const)),
    ],
  }
}

export const Z014_D0A = frontAndFinish('D0a')
export const Z014_D0B = frontAndFinish('D0b')
export const Z014_D0C = frontAndFinish('D0c')
export const Z014_D0D = frontAndFinish('D0d')

/**
 * The paces, Z-015–Z-017 (p. 23): "V místě pro provedení cviku tým zpomalí / zrychlí své
 * tempo. Změna tempa musí být u psovoda i psa zřetelná. Tým udržuje … tempo, dokud jiný
 * cvik toto tempo nezmění." In the video the slow pace is a slow walk with the dog walking,
 * the fast one a jog with the dog trotting. Normal pace makes sense only after slow or fast,
 * so for Z-017 the team comes slowly from the card before.
 */
const APPROACH = { slow: 'approachSlow', normal: 'approach', fast: 'approachFast' }

const changePace = (
  code: string,
  pace: 'slow' | 'normal' | 'fast',
  caption: string,
  from: 'slow' | 'normal' | 'fast' = 'normal',
): Exercise => ({
  code,
  ...(from !== 'normal' && { fromPace: from }),
  steps: [
    { walk: 3.5, pace: from, caption: APPROACH[from] },
    { walk: 1.5, pace, caption },
    { walk: 3, pace, caption: pace === 'normal' ? 'leave' : 'paceHold' },
  ],
})

/** Z-015 Pomalé tempo — p. 23. */
export const Z015 = changePace('Z-015', 'slow', 'slowPace')
/** Z-016 Rychlé tempo — p. 23. */
export const Z016 = changePace('Z-016', 'fast', 'fastPace')
/** Z-017 Normální tempo (chůze) — p. 23: after slow or fast pace, as the viewer picks. */
export const Z017 = changePace('Z-017', 'normal', 'normalPace', 'slow')
export const Z017_FROM_FAST = changePace('Z-017', 'normal', 'normalPace', 'fast')

/**
 * Z-023 Stop – pes okolo psovoda – stop (p. 26): "Tým zastaví u karty … a zaujme základní
 * pozici. Pes oběhne psovoda zepředu a poté opět usedá u nohy psovoda. Psovod zůstává stát po
 * celou dobu cviku (tj. nehýbe nohama)." In the video the dog sits, then runs round in about
 * two seconds and sits again.
 */
export const Z023: Exercise = {
  code: 'Z-023',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 0.8, caption: 'basePosition' },
    { dogPath: 'aroundFromHeel', caption: 'dogAroundHandler' },
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
    { walk: 3, caption: 'leave' },
  ],
}

/**
 * Z-024 Stop – jeden krok vpřed – stop (p. 26): "Na povel psovoda tým postoupí o jeden krok
 * vpřed a zaujímá základní pozici." One step and the other foot closing up; the dog gets up,
 * comes along and sits again.
 */
export const Z024: Exercise = {
  code: 'Z-024',
  steps: [
    { walk: 3.5, caption: 'approach' },
    { stop: true, caption: 'stop' },
    { dog: 'sit', caption: 'sit' },
    { wait: 1, caption: 'basePosition' },
    { walk: 0.3, pace: 'slow', caption: 'oneStep' },
    { stop: true, caption: 'oneStep' },
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
    { walk: 3, pace: 'normal', caption: 'leave' },
  ],
}

/** Z-028 225° vpravo (p. 28): "psovod provádí obrat na místě … Pes … zůstává stále u nohy." */
export const Z028 = turnOnTheSpot('Z-028', 225, 'turnRight225', 'ahead')
/** Z-029 225° vlevo — p. 28. */
export const Z029 = turnOnTheSpot('Z-029', -225, 'turnLeft225', 'ahead')

/**
 * Z-030/Z-031 Stop – vpravo / vlevo – stop (p. 29): "Tým se zastaví před kartou a zaujme
 * základní pozici. Poté psovod společně se psem během obratu vpravo provede 3 kroky, a
 * následně tým opět zaujme základní pozici." A change of direction, so the card stands ahead.
 * The three steps as the author does them, turning left: the left foot a short step ahead,
 * turned 45°; the right foot round it into the new direction; the left foot closing up
 * beside it. Turning right, the same mirrored.
 */
const turnSteps = (sign: 1 | -1): FootTarget[] => {
  const [inner, outer] = sign === 1 ? [0, 1] : [1, 0]
  return [
    { foot: inner, x: sign * 0.1, z: 0.05, yaw: (sign * Math.PI) / 4 },
    { foot: outer, x: sign * 0.15, z: 0.38, yaw: (sign * Math.PI) / 2 },
    { foot: inner, x: sign * 0.15, z: 0.18, yaw: (sign * Math.PI) / 2 },
  ]
}

const stopTurnStop = (code: string, sign: 1 | -1, caption: string): Exercise => ({
  code,
  card: 'ahead',
  steps: [
    { walk: 3.5, caption: 'approachTurn' },
    { stop: true, caption: 'stopAhead' },
    { dog: 'sit', caption: 'sit' },
    { wait: 1, caption: 'basePosition' },
    { footwork: turnSteps(sign), caption },
    { dog: 'sit', caption: 'finishSit' },
    { wait: 1, caption: 'basePosition' },
    { walk: 3, caption: 'leaveTurn' },
  ],
})

// Left turns the heading up (towards +x, the handler's left).
export const Z030 = stopTurnStop('Z-030', -1, 'stopTurnRight')
export const Z031 = stopTurnStop('Z-031', 1, 'stopTurnLeft')

/** The exercises the page can play, in card order (Z-014 once per supplementary card). */
export const EXERCISES: Exercise[] = [
  Z001,
  Z002,
  Z003,
  Z004,
  Z005,
  Z006,
  Z007,
  Z008,
  Z009,
  Z011,
  Z012,
  Z013,
  Z014_D0A,
  Z014_D0B,
  Z014_D0C,
  Z014_D0D,
  Z015,
  Z016,
  Z017,
  Z017_FROM_FAST,
  Z023,
  Z024,
  Z028,
  Z029,
  Z030,
  Z031,
]

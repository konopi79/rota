import type { Exercise } from './exercise'

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

/** The exercises the page can play, in card order. */
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
]

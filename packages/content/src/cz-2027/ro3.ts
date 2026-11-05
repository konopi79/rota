import type { ClassContent2027 } from './types'

/**
 * What VDH 2027 changes in RO3 (plan R22), from Anhang 2 "RO 3 (Übungen 3-301 bis 3-332 …)",
 * Seite 55–63. Diff: `.cache/vdh2027/diff/ro3.md`. Old 3-302 (the recall from an angle) is gone:
 * 2027's 3-302 is a two-jump exercise, and 2-214 takes its place after the angled leave cards.
 *
 * The side mark of §3.7 (S. 11): "Bei den Übungen 301, 314, 324 und 329 sowie den nachfolgenden
 * Abrufübungen ist eine seitliche Markierung des Arbeitsbereiches erforderlich. Diese
 * Markierungen dürfen vom Hundeführer … nicht berührt oder übertreten werden."
 */
const SIDE_MARK =
  'Místo pro provedení cviku i následujícího přivolání je ze strany vyznačeno; psovod se značky nesmí dotknout ani ji překročit.'

/** The angled leave cards' follow-ups (301, 314, 324, 329): "214 Z a-e, 319 Z a-e, 215 und 216". */
const ANGLED_FOLLOW_UPS =
  'Další cvik v parkuru musí být vybrán z těchto karet: 2-214 a D0a–e, 3-319 a D0a–e, 2-215, 2-216.'

/** 307, 310, 312: "213, 215, 216, 320, 321, 322 sowie 214, 308, 309, 319 jeweils mit Z a-e". */
const LEAVE_FOLLOW_UPS = [
  '2-213',
  '2-215',
  '2-216',
  '3-320',
  '3-321',
  '3-322',
  '2-214',
  '3-308',
  '3-309',
  '3-319',
]
const LEAVE_FOLLOW_UPS_TEXT =
  'Další cvik v parkuru musí být vybrán z těchto karet: 2-213, 2-215, 2-216, 3-320, 3-321, 3-322, a také 2-214, 3-308, 3-309, 3-319 s doplňkovou kartou D0a–e.'

export const RO3_2027: ClassContent2027 = {
  changes: {
    '3-301': {
      description: [
        'Karta může být libovolně vlevo nebo vpravo trasy psovoda. Tým zaujímá základní pozici. Na pokyn psovoda pes zůstává na místě a psovod odchází k následující kartě.',
        ANGLED_FOLLOW_UPS,
        'Karty jsou umístěny minimálně 3 metry od sebe. Další cviky jsou posunuty o 180 cm vpravo nebo vlevo od konce místa cviku.',
        SIDE_MARK,
      ],
      sequencing: {
        // VDH 2027, S. 55: "In Kombination mit den Schilder 214 Z a-e, 319 Z a-e, 215 und 216."
        // (2026: 3-302 instead of 2-214.)
        nextOneOf: ['2-214', '3-319', '2-215', '2-216'],
      },
      // "mind. 3m entfernt und ca. 1,80 m … nach rechts oder links seitlich verschoben": away from
      // the card's side, as the club's video of the new cards shows it both ways round (3-329,
      // 5:53; the author) — the card stands right of the team, so to the left.
      geometry: { followUp: { ahead: 4, sides: [1.8] } },
    },
    '3-307': {
      description: [
        'Tým se zastaví v místě pro provedení cviku a pes zůstane stát u nohy psovoda, aniž by si předtím sedl. Psovod velí psovi zůstat ve stoje a odchází k další kartě.',
        LEAVE_FOLLOW_UPS_TEXT,
      ],
      sequencing: {
        // VDH 2027, S. 56: "In Kombination mit den Schildern 213, 215, 216, 320, 321, 322 sowie
        // 214, 308, 309, 319 jeweils mit Z a-e" — no 3-302 any more.
        nextOneOf: LEAVE_FOLLOW_UPS,
      },
    },
    '3-308': {
      // VDH 2027, S. 57: "Dieser Übung muss ein Zusatzschild aus den Nr. a-e angeschlossen werden."
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'Psovod se otáčí před kartou a přivolá psa. Když je pes v pohybu velí psovod psa do pozice lehni. Pes musí zaujmout polohu nejpozději do ⅔ vzdálenosti ke psovodovi (vzdálenost ⅔ je označena). Jakmile pes zaujme polohu, je opět psovodem přivolán do předsednutí. Během předsednutí a při provádění doplňkových cviků psovod nesmí hýbat nohama.',
      ],
    },
    '3-309': {
      // VDH 2027, S. 57: "Dieser Übung muss ein Zusatzschild aus den Nr. a-e angeschlossen werden."
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'Psovod se otáčí před kartou a velí psa do pozice lehni. Jakmile pes zaujme polohu, dostává další povel k zaujetí pozice sedni. Pes by měl změny poloh vykonat, pokud možno na místě. Jakmile pes sedí, psovod jej přivolává do předsednutí. Během předsednutí a při provádění doplňkových cviků psovod nesmí hýbat nohama.',
      ],
    },
    '3-310': {
      description: [
        'V místě pro vykonání cviku psovod, aniž by se zastavil, odkládá psa do sedu. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Pes musí zaujmout danou pozici zhruba do vzdálenosti jedné délky svého těla. Psovod pokračuje k další kartě.',
        LEAVE_FOLLOW_UPS_TEXT,
      ],
      sequencing: {
        // VDH 2027, S. 57: "In Kombination mit den Schildern 213, 215, 216, 320, 321, 322 sowie
        // 214, 308, 309, 319 jeweils mit Z a-e" — no 3-302 any more.
        nextOneOf: LEAVE_FOLLOW_UPS,
      },
    },
    '3-311': {
      description: [
        'V místě pro vykonání cviku psovod, aniž by se zastavil, odkládá psa do lehu. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Pes musí zaujmout danou pozici zhruba do vzdálenosti jedné délky svého těla. Psovod pokračuje k další kartě.',
        'Další cvik v parkuru musí být vybrán z těchto karet: 2-213, 2-215, 2-216, 3-320, 3-321, a také 2-214, 3-308, 3-319 s doplňkovou kartou D0a–e.',
      ],
      sequencing: {
        // VDH 2027, S. 58: "In Kombination mit den Schildern 213, 215, 216, 320, 321, sowie 214,
        // 308, 319 jeweils mit Z a-e" — still no 322 or 309 (the dog is already down), no 3-302.
        nextOneOf: ['2-213', '2-215', '2-216', '3-320', '3-321', '2-214', '3-308', '3-319'],
      },
    },
    '3-312': {
      description: [
        'V místě pro vykonání cviku psovod, aniž by se zastavil, odkládá psa do stoje. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Pes musí zaujmout danou pozici zhruba do vzdálenosti jedné délky svého těla. Psovod pokračuje k další kartě.',
        LEAVE_FOLLOW_UPS_TEXT,
      ],
      sequencing: {
        // VDH 2027, S. 58: "In Kombination mit den Schildern 213, 215, 216, 320, 321, 322 sowie
        // 214, 308, 309, 319 jeweils mit Z a-e" — no 3-302 any more.
        nextOneOf: LEAVE_FOLLOW_UPS,
      },
    },
    '3-314': {
      description: [
        'Karta může být umístěna libovolně vlevo nebo vpravo od trasy psovoda. Tato karta následuje vždy po kartě se statickým cvikem (typ A) a musí být umístěna minimálně 5 metrů před překážkou. Překážka se nachází přibližně 180 cm vpravo nebo vlevo od konce místa pro vykonání cviku. Psovod odkládá psa v konečné pozici z posledního cviku a odchází podél překážky k následující kartě.',
        'Další cvik v parkuru musí být vybrán z těchto karet: 3-319 a D0a–e, 2-214 a D0a–e, 2-215, 2-216. Tyto karty se nacházejí minimálně 5 metrů od překážky a jsou posunuty o 180 cm vpravo či vlevo.',
        SIDE_MARK,
      ],
      sequencing: {
        // VDH 2027, S. 59: "Dieses Schild kann mit folgenden Abrufschildern kombiniert werden:
        // 319 und 214 Z a-e, sowie 215, 216." (2026: 3-302 instead of 2-214.)
        nextOneOf: ['3-319', '2-214', '2-215', '2-216'],
        // S. 59: "wird zwingend in einer Kombination mit einer stationären Übung (Typ A) gestellt".
        afterStatic: true,
        equipment: ['jump'],
      },
      // The geometry stays: "mind. 5 m vor der Hürde", "Die Schilder stehen mind. 5m vom Sprung
      // entfernt ca. 1,80 m nach rechts oder links verschoben" (the 10 m is now 5 m + 5 m for
      // every follow-up, no longer old 3-302's own rule).
    },
    '3-316': {
      // VDH 2027, S. 17 (180° Drehung): "dreht sich auf der Stelle um 180° … (auf einem DIN A 4
      // Blatt)" — instead of the Czech 2026 "(max. 4 kroky nohou)".
      description: [
        'Tým zastaví před kartou, pes zůstává stát vedle nohy psovoda. Tým provede na místě (na ploše listu A4) obrat o 180° vpravo. Na konci cviku pes zůstává opět v pozici stůj.',
      ],
    },
    '3-317': {
      // VDH 2027, S. 17 (180° Drehung): "dreht sich auf der Stelle um 180° … (auf einem DIN A 4
      // Blatt)" — instead of the Czech 2026 "(max. 4 kroky nohou)".
      description: [
        'Tým zastaví před kartou, pes zůstává stát vedle nohy psovoda. Tým provede na místě (na ploše listu A4) obrat o 180° vlevo. Na konci cviku pes zůstává opět v pozici stůj.',
      ],
    },
    '3-319': {
      // VDH 2027, S. 60: "Ist der Hund in der Fußposition, darf der HF einen Schritt
      // rückwärtsgehen" (2026: "až čtyři kroky vzad"); "Zusatzschild aus den Nr. a-e".
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'V místě pro vykonání cviku se psovod zastaví (neotáčí se) a přivolá psa do předsednutí. Psovod může pohnout horní polovinou těla, ale nohy musí zůstat ve směru původního pohybu. Pes musí přijít do předsednutí z té strany, na které se nacházel u předchozího odkládacího cviku. Jakmile se pes dostane na úroveň nohy psovoda a než si pes předsedne, může psovod udělat jeden krok vzad v přímém směru, aby psovi předsednutí ulehčil, ale nesmí úkrokem do strany korigovat pozici psa. Během předsednutí a během provádění cviku z doplňkové karty nesmí psovod pohybovat nohama.',
      ],
    },
    '3-320': {
      // VDH 2027, S. 60: "Der HF darf während des Abrufs die Füße nicht bewegen." — not in the
      // Czech 2026 text.
      description: [
        'V místě pro vykonání cviku se psovod otočí a následně přivolá psa. Jakmile je pes v pohybu velí psovod psa do pozice lehni. Pes musí zaujmout polohu nejpozději do ⅔ vzdálenosti ke psovodovi (vzdálenost ⅔ je označena). Během přivolání nesmí psovod hýbat nohama. Jakmile pes zaujme polohu v leže, psovod se vrací ke psu a postaví se na stejnou stranu u nohy jako u předchozího odkládacího cviku.',
      ],
    },
    '3-321': {
      // VDH 2027, S. 60: "Ist der Hund in der linken Fußposition, begibt sich das Team, ohne dass
      // der Hund sich vorher setzt, zur nächsten Station." (2026: "v pozici u nohy".)
      description: [
        'Před kartou se psovod otočí a následně přivolá psa. Jakmile je pes v pohybu, velí psovod psa do pozice lehni. Pes musí zaujmout polohu nejpozději do ⅔ vzdálenosti ke psovodovi (vzdálenost ⅔ je označena). Jakmile pes zaujme polohu, je opět psovodem přivolán k levé noze. Pokud je pes v pozici u levé nohy, tým pokračuje (aniž by si pes sedl) k další kartě.',
        'Během přivolání nesmí psovod hýbat nohama.',
      ],
      sequencing: {
        // Listed as the follow-up of a leave card — never dealt on its own.
        onlyAfterLeave: true,
        // S. 60: "Ist der Hund in der linken Fußposition" — the recall ends on the left, whichever
        // side the dog was left on.
        endSide: 'left',
      },
    },
    '3-323': {
      // VDH 2027, S. 61: "Wenn der Hund die Fußposition erreicht hat, darf der HF noch einen
      // Schritt rückwärtsgehen" (2026: "až 4 kroky zpět"); "Diesem Schild wird zwingend ein
      // Zusatzschild aus den Schildern a-e zugefügt".
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'Cvik vyžaduje minimální vzdálenost 8 m k dalšímu cviku.',
        'Tým se zastaví v místě pro provedení cviku a zaujme základní pozici. Psovod dává povel psovi k setrvání na místě a odbíhá od něj přímým směrem (zády ke psu) a minimálně po 3 krocích běhu jej za běhu přivolává do předsednutí. Pes musí okamžitě reagovat a vyběhnout za psovodem. Jakmile pes dosáhne úrovně nohy psovoda, smí psovod udělat jeden krok zpět tak, aby psovi předsednutí usnadnil. Během předsednutí a při provádění doplňkových cviků psovod nesmí hýbat nohama. Rychlost, kterou se psovod pohybuje vpřed, je závislá na možnostech psa ho dostihnout. Běh musí být zřetelně odlišitelný od normálního tempa.',
      ],
    },
    '3-324': {
      // VDH 2027, S. 61: "Die Pylone wird 3-5 m seitlich versetzt, in einem Winkel von 45-90 Grad,
      // neben dem Arbeitsbereich positioniert. Im Arbeitsbereich nimmt das Team eine Grundstellung
      // ein, eine Ausrichtung in Richtung Pylone ist erlaubt." (2026: "5 m na stranu", facing the
      // cone required.) The 2026 geometry stays: its cone 4.3 m to the side is within 3–5 m.
      description: [
        'V místě pro vykonání cviku tým zaujme základní pozici, smí se přitom natočit směrem ke kuželu. Kužel je umístěn 3–5 m stranou od místa pro provedení cviku, pod úhlem 45–90°. Psovod vysílá psa ke kuželu. V okruhu max. 1 m od kužele je pes zastaven ve stoje. Pes zůstává v této pozici vedle kužele, zatímco psovod přechází k další kartě.',
        ANGLED_FOLLOW_UPS,
        SIDE_MARK,
      ],
      sequencing: {
        // S. 61: "Dieses Schild kann mit folgenden Abrufschildern kombiniert werden: 214, 319 Z a-e
        // und 215, 216." (2026: 3-302 instead of 2-214.)
        nextOneOf: ['2-214', '3-319', '2-215', '2-216'],
        equipment: ['cones'],
      },
    },
  },
  cards: [
    {
      code: '3-302',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'B',
      name: 'Skok přes 2 překážky – psovod těsně vedle překážek',
      description: [
        'Skoky se provádějí přes dvě laťkové překážky. Karta cviku může být na libovolné straně postupu psovoda, minimálně však 2 metry před první překážkou. Překážky mohou stát v přímé linii nebo pod úhlem až 90° a jsou od sebe vzdáleny 4 až 5 metrů.',
        'Cvik začíná v místě pro provedení cviku v pozici u nohy. Ústní a/nebo posunkový povel k překonání první překážky může psovod dát i za místem pro provedení cviku. Psovod vysílá psa na první překážku a dává povel k jejímu překonání, zatímco sám jde podél překážky. Jakmile pes překoná překážku, psovod jej přivolá k noze, nebo jej vyšle rovnou na druhou překážku a sám jde podél ní. Jakmile pes překoná druhou překážku, psovod přivolá psa k noze a pokračují společně k dalšímu cviku. Pokud je pes při překonávání rychlejší než psovod, může být psovodem přivolán zpět k noze. Tým zůstává v pohybu.',
        'Následné karty jsou umístěny ve vzdálenosti minimálně 5 metrů od překážky.',
      ],
      sequencing: {
        // VDH 2027, S. 55: "Die Sprünge erfolgen über zwei Hürden."
        equipment: ['jump'],
      },
      // By hand, after 2-217 (the handler "dicht nebenher", the jump 1 m to the dog's side; the
      // dog's way along the jumps and back into heel 3.5 m past the last one, the handler's 1.5 m
      // past it) and FCI 320 (two jumps in a line): "mind. 2 m vor der ersten Hürde", the jumps
      // "vier bis fünf Meter voneinander entfernt" — 3 m and 7.5 m on, in a straight line only
      // ("in einer geraden Linie oder in einem Winkel von bis zu 90°"); "Die nachfolgenden Schilder
      // stehen mind. 5m vom Sprung entfernt" — 5 m past the second jump.
      geometry: {
        exit: 7.5,
        gap: 12.5,
        via: [
          [9, 0],
          [0, 0.4],
          [1.5, 1],
          [9, 1],
          [11, 0.4],
        ],
        props: [
          { kind: 'jump', ahead: 3, side: 1 },
          { kind: 'jump', ahead: 7.5, side: 1 },
        ],
      },
      image: '3-302',
      sourcePage: 55,
    },
    {
      code: '3-328',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      placement: 'B',
      exerciseType: 'B',
      name: 'Obrat od sebe',
      description: [
        'Psovod a pes se před kartou současně otočí o 180° každý směrem od sebe a poté pokračují v opačném směru. Strana vedení psa se změní. Tým zůstává v pohybu.',
      ],
      sequencing: {
        // VDH 2027, S. 62: "Der Hund wechselt dabei die Fußposition."
        sideChange: true,
      },
      // S. 62: "jeweils eine 180° Drehung voneinander weg" — with the dog on the left the handler
      // turns right (the card: the dog's arrow left, the handler's right); the mirror of 2-232's
      // -180 ("směrem k sobě"). An about turn: placed before the card (§3.6, S. 10).
      geometry: { turn: 180 },
      image: '3-328',
      sourcePage: 62,
    },
    {
      code: '3-329',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'A',
      name: 'Zastavit – odložení ve stoje – psovod šikmo',
      description: [
        'Karta může být libovolně vlevo nebo vpravo trasy psovoda. Tým se zastaví v místě pro provedení cviku a pes zůstane stát vedle psovoda. Na pokyn psovoda pes zůstává na místě a psovod odchází k následující kartě.',
        ANGLED_FOLLOW_UPS,
        'Karty jsou umístěny minimálně 3 metry od sebe. Další cviky jsou posunuty o 180 cm vpravo nebo vlevo od konce místa cviku.',
        SIDE_MARK,
      ],
      sequencing: {
        // VDH 2027, S. 62: "In Kombination mit den Schilder 214 Z a-e, 319 Z a-e, 215 und 216."
        nextOneOf: ['2-214', '3-319', '2-215', '2-216'],
      },
      // As 3-301: "Die Schilder stehen mind. 3m entfernt und ca. 1,80 m vom Ende seitlich des
      // Arbeitsbereiches nach rechts oder links seitlich verschoben" — away from the card's side.
      geometry: { followUp: { ahead: 4, sides: [1.8] } },
      image: '3-329',
      sourcePage: 62,
    },
    {
      code: '3-330',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'A',
      name: 'Odložení za pochodu do sedu – okolo psa',
      description: [
        'V místě pro provedení cviku psovod, aniž by se zastavil, odkládá psa do sedu a velí mu zůstat. Pes musí zaujmout pozici z pohybu. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Psovod obejde psa zepředu ve vzdálenosti nejvýše 50 cm, vrátí se do pozice u nohy a zastaví se. Pes musí zaujmout pozici dříve, než psovod dojde k jeho protějšímu rameni. Pes zůstává sedět, dokud se tým opět nerozejde.',
      ],
      // VDH 2027, S. 63: the handler comes back to the dog ("zurück in die Fußposition und bleibt
      // stehen") — not a leave card, no follow-up. Round the dog "vorwärts" (S. 16), within 50 cm:
      // done on the spot, no geometry (as 3-303).
      sequencing: {},
      image: '3-330',
      sourcePage: 63,
    },
    {
      code: '3-331',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'A',
      name: 'Odložení za pochodu do lehu – okolo psa',
      description: [
        'V místě pro provedení cviku psovod, aniž by se zastavil, odkládá psa do lehu a velí mu zůstat. Pes musí zaujmout pozici z pohybu. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Psovod obejde psa zepředu ve vzdálenosti nejvýše 50 cm, vrátí se do pozice u nohy a zastaví se. Pes musí zaujmout pozici dříve, než psovod dojde k jeho protějšímu rameni. Pes zůstává ležet, dokud se tým opět nerozejde.',
      ],
      // VDH 2027, S. 63: as 3-330 — not a leave card, done on the spot.
      sequencing: {},
      image: '3-331',
      sourcePage: 63,
    },
    {
      code: '3-332',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'A',
      name: 'Odložení za pochodu do stoje – okolo psa',
      description: [
        'V místě pro provedení cviku psovod, aniž by se zastavil, odkládá psa do stoje a velí mu zůstat. Pes musí zaujmout pozici z pohybu. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Psovod obejde psa zepředu ve vzdálenosti nejvýše 50 cm, vrátí se do pozice u nohy a zastaví se. Pes musí zaujmout pozici dříve, než psovod dojde k jeho protějšímu rameni. Pes zůstává stát, dokud se tým opět nerozejde.',
      ],
      // VDH 2027, S. 63: as 3-330 — not a leave card, done on the spot.
      sequencing: {},
      image: '3-332',
      sourcePage: 63,
    },
  ],
  pages: {
    '3-301': 55,
    '3-302': 55,
    '3-303': 55,
    '3-304': 56,
    '3-305': 56,
    '3-306': 56,
    '3-307': 56,
    '3-308': 57,
    '3-309': 57,
    '3-310': 57,
    '3-311': 58,
    '3-312': 58,
    '3-313': 58,
    '3-314': 59,
    '3-315': 59,
    '3-316': 59,
    '3-317': 59,
    '3-318': 60,
    '3-319': 60,
    '3-320': 60,
    '3-321': 60,
    '3-322': 61,
    '3-323': 61,
    '3-324': 61,
    '3-325': 62,
    '3-326': 62,
    '3-327': 62,
    '3-328': 62,
    '3-329': 62,
    '3-330': 63,
    '3-331': 63,
    '3-332': 63,
  },
}

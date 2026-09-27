import type { Card } from '../schema'

/**
 * 3-point FCI cards. Proofread from the Czech translation of the FCI Rally Obedience
 * rules, valid from 1 Feb 2025, §5 (`sourcePage` = page of that PDF).
 */
export const FCI_THREE_POINT_CARDS: Card[] = [
  {
    code: '301',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Úkrok doprava',
    nameEn: 'SIDE STEP RIGHT',
    description: [
      'Za stálého pohybu udělá psovod úkrok stranou doprava, pes jej následuje a pohybuje se současně a rovnoběžně s ním. Tým pokračuje parkurem po pravé straně karty.',
    ],
    sequencing: {},
    image: '301',
    sourcePage: 25,
  },
  {
    code: '302',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Úkrok doleva',
    nameEn: 'SIDE STEP LEFT',
    description: [
      'Za stálého pohybu udělá psovod úkrok stranou doleva, pes jej následuje a pohybuje se současně a rovnoběžně s ním.',
    ],
    sequencing: {},
    image: '302',
    sourcePage: 25,
  },
  {
    code: '303',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Stop, úkrok vpravo, stop',
    nameEn: 'STOP, SIDE STEP RIGHT, STOP',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Psovod udělá jeden krok vpravo a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem. Jakmile se psovod zastaví, pes znovu zaujímá pozici sedni u jeho nohy. Pes zůstává sedět, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '303',
    sourcePage: 25,
  },
  {
    code: '304',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Stop, úkrok vlevo, stop',
    nameEn: 'STOP, SIDE STEP LEFT, STOP',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Psovod udělá jeden krok vlevo a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem. Jakmile se psovod zastaví, pes znovu zaujímá pozici sedni u jeho nohy. Pes zůstává sedět, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '304',
    sourcePage: 25,
  },
  {
    code: '305',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Stop, 1 krok vzad, sedni, 2 kroky vzad, sedni',
    nameEn: 'STOP, 1 STEP BACK STOP, 2 STEPS BACK STOP',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Psovod udělá jeden krok vzad a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici sedni. Poté psovod udělá dva kroky vzad a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici sedni. Pes zůstává sedět, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '305',
    sourcePage: 26,
  },
  {
    code: '306',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Předsednutí, 1 krok vzad, stůj, 2 kroky vzad, sedni, 3 kroky vzad, lehni',
    nameEn: 'CALL FRONT STOP, 1 STEP BACK STAND, 2 STEPS BACK STOP, 3 STEPS BACK DOWN',
    description: [
      'Psovod se zastaví a velí psa do předsednutí (pozice sedni před psovodem). Následně psovod udělá 1 krok vzad a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici stůj před psovodem. Poté psovod provede 2 kroky vzad a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici sedni před psovodem. Poté psovod provede 3 kroky vzad a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici lehni před psovodem. Poté psovod velí psa do přiřazení k levé noze a pes usedá vlevo vedle psovoda. Pes zůstává sedět, dokud tým nepokračuje vpřed. Návrat k vedení psa po levé straně psovoda.',
    ],
    sequencing: {
      // p. 26: "Návrat k vedení po levé straně."
      endSide: 'left',
    },
    image: '306',
    sourcePage: 26,
  },
  {
    code: '307',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Stůj, 180° vpravo, stůj',
    nameEn: 'STAND, 180° RIGHT TURN, STAND',
    description: [
      'Psovod se zastaví a pes vedle psovoda zůstane v pozici stůj. Tým provede společně na místě obrat čelem vzad vpravo o 180°, zastavuje a pes zůstane v pozici stůj. Pes zůstává stát, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '307',
    sourcePage: 26,
  },
  {
    code: '308',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Stůj, 180° vlevo, stůj',
    nameEn: 'STAND, 180° LEFT TURN, STAND',
    description: [
      'Psovod se zastaví a pes vedle psovoda zůstane v pozici stůj. Tým provede společně na místě obrat čelem vzad vlevo o 180°, zastavuje a pes zůstane v pozici stůj. Pes zůstává stát, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '308',
    sourcePage: 26,
  },
  {
    code: '309',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Stůj, okolo psovoda, stůj',
    nameEn: 'STAND, CIRCLE AROUND HANDLER, STAND',
    description: [
      'Psovod se zastaví a pes zůstává v pozici stůj vedle psovoda. Psovod následně navede psa, aby jej zepředu oběhl. Pes následně zaujímá opět pozici stůj vedle psovoda. Pes zůstává stát, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '309',
    sourcePage: 26,
  },
  {
    code: '310',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Otočka proti sobě',
    nameEn: 'TURN TOWARD',
    description: [
      'Za pohybu tým současně provede otočku směrem proti sobě o 180° a pokračuje v opačném směru. Tímto cvikem se mění strana vedení psa.',
    ],
    sequencing: {
      // p. 26: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '310',
    sourcePage: 26,
  },
  {
    code: '311',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Změna strany za psovodem',
    nameEn: 'SIDE SHIFT BEHIND',
    description: [
      'Za pohybu pes změní stranu vedení za zády psovoda. Pes nesmí provést otočku, aby se dostal z jedné strany na druhou. Tímto cvikem se mění strana vedení psa.',
    ],
    sequencing: {
      // p. 26: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '311',
    sourcePage: 26,
  },
  {
    code: '312',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Změna strany mezi nohama',
    nameEn: 'SIDE SHIFT BETWEEN LEGS',
    description: [
      'Pes změní stranu vedení mezi nohama psovoda. V okamžiku, kdy pes provádí tento cvik, se psovod smí zastavit. Psovod může rovněž zvednout nohu za účelem plynulé změny strany. Tímto cvikem se mění strana vedení psa.',
    ],
    sequencing: {
      // p. 27: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '312',
    sourcePage: 27,
  },
  {
    code: '313',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Každý sám čelem vzad doprava',
    nameEn: 'BOTH ABOUT TURN RIGHT',
    description: [
      'Za pohybu pes i psovod provedou každý zvlášť těsný obrat o 180° doprava a pokračují v opačném směru. Tímto cvikem se mění strana vedení psa.',
    ],
    sequencing: {
      // p. 27: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '313',
    sourcePage: 27,
  },
  {
    code: '314',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Každý sám čelem vzad doleva',
    nameEn: 'BOTH ABOUT TURN LEFT',
    description: [
      'Za pohybu pes i psovod provedou každý zvlášť těsný obrat o 180° doleva a pokračují v opačném směru. Tímto cvikem se mění strana vedení psa.',
    ],
    sequencing: {
      // p. 27: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '314',
    sourcePage: 27,
  },
  {
    code: '315',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Stop, změna strany za psovodem, stop',
    nameEn: 'STOP, SIDE SHIFT BEHIND, STOP',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Následně je pes velen ke změně strany za zády psovoda, pes zaujímá pozici sedni u druhé nohy psovoda. Pes nesmí provést otočku, aby se dostal z jedné strany na druhou. Jakmile je změna strany dokončena, tým pokračuje vpřed. Tímto cvikem se mění strana vedení psa.',
    ],
    sequencing: {
      // p. 27: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '315',
    sourcePage: 27,
  },
  {
    code: '316',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Stop, změna strany před psovodem, stop',
    nameEn: 'STOP, SIDE SHIFT IN FRONT, STOP',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Následně je pes velen ke změně strany před psovodem (předem), pes zaujímá pozici sedni u druhé nohy psovoda. Pes musí provést otočku, aby se dostal z jedné strany na druhou. Jakmile je změna strany dokončena, tým pokračuje vpřed. Tímto cvikem se mění strana vedení psa.',
    ],
    sequencing: {
      // p. 27: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '316',
    sourcePage: 27,
  },
  {
    code: '317',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Odložení do stoje, okolo psa',
    nameEn: 'MOVING STAND, WALK AROUND',
    description: [
      'Za pohybu je pes velen do pozice stůj, zatímco psovod pokračuje bez zastavení vpřed, obchází psa zepředu, vrací se do výchozí pozice po boku psa a zastaví. Pes zůstává stát, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '317',
    sourcePage: 27,
  },
  {
    code: '318',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Odložení do lehu, okolo psa',
    nameEn: 'MOVING DOWN, WALK AROUND',
    description: [
      'Za pohybu je pes velen do pozice lehni, zatímco psovod pokračuje bez zastavení vpřed, obchází psa zepředu, vrací se do výchozí pozice po boku psa a zastaví. Pes zůstává ležet, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '318',
    sourcePage: 27,
  },
  {
    code: '319',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 3,
    name: 'Odložení do stoje, chůze vpřed',
    nameEn: 'STOP, STAND, WALK FORWARD',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Poté je pes velen do pozice stůj. Následně psovod pokračuje, bez psa, buď ke kuželu pro přivolání (C), kde přivolává psa (strana vedení se nemění), nebo ke kartě pro přivolání, které provede dle instrukcí na kartě uvedených. Pokud nenásleduje žádná karta pro přivolání, pak je kužel pro přivolání i samotné přivolání součástí tohoto cviku.',
    ],
    sequencing: {
      // p. 28: the recall happens at a cone, or at a following recall card.
      mayBeFollowedBy: ['321', '322', '323', '421', '422'],
    },
    image: '319',
    sourcePage: 28,
  },
  {
    code: '320',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'D',
    points: 3,
    name: 'Vyslání přes dvě překážky',
    nameEn: 'SEND OVER TWO JUMPS',
    description: [
      'Pes je vyslán skočit přes dvě překážky, přičemž povel k vyslání může být dán nejdříve vedle karty, která se nachází 2 m před první překážkou. Překážky mohou být postaveny v přímce za sebou nebo v úhlu až 90°, ale v obou případech musí být od sebe vzdáleny minimálně 4 m. Psovod současně pokračuje chůzí podél překážek.',
    ],
    sequencing: {
      equipment: ['jump'],
    },
    image: '320',
    sourcePage: 28,
  },
  {
    code: '321',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Čelem vzad a přivolání',
    nameEn: 'TURN AROUND, RECALL',
    description: [
      'Tato karta může být použita pouze po kartách 319, 408 a 409, místo kuželu pro přivolání, a musí být umístěna ve vzdálenosti 3 - 5 m od předchozí karty. Psovod se otáčí čelem vzad, zastaví se a přivolává psa. Psovod se může zastavit před otočením se čelem vzad. Pes je velen do přiřazení k levé noze psovoda (aniž by zaujal pozici sedni). Jakmile pes dosáhne úrovně psovoda u levé nohy, tým pokračuje vpřed. Návrat k vedení po levé straně.',
    ],
    sequencing: {
      // p. 28: "Návrat k vedení po levé straně."
      endSide: 'left',
      // p. 28: "Tato karta může být použita pouze po kartách 319, 408 a 409".
      onlyAfterLeave: true,
    },
    image: '321',
    sourcePage: 28,
  },
  {
    code: '322',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Čelem vzad, přivolání do předsednutí, přiřazení okolo zprava doleva, stop',
    nameEn: 'TURN AROUND, RECALL FRONT STOP, RIGHT TO LEFT, STOP',
    description: [
      'Tato karta může být použita pouze po kartách 319, 408 a 409, místo kuželu pro přivolání, a musí být umístěna ve vzdálenosti 3 - 5 m od předchozí karty. Psovod se otáčí čelem vzad, zastaví se a přivolává psa. Psovod se může zastavit před otočením se čelem vzad. Psovod přivolává psa do pozice předsednutí před psovoda. Poté psovod velí psovi povel k přiřazení, které pes vykonává tak, že míjí psovoda zepředu po jeho pravé straně a zezadu jej obchází zpět k levé noze, kde zaujímá pozici sedni. Pes zůstává sedět, dokud tým nepokračuje vpřed. Návrat k vedení po levé straně.',
    ],
    sequencing: {
      // p. 28: "Návrat k vedení po levé straně."
      endSide: 'left',
      // p. 28: "Tato karta může být použita pouze po kartách 319, 408 a 409".
      onlyAfterLeave: true,
    },
    image: '322',
    sourcePage: 28,
  },
  {
    code: '323',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 3,
    name: 'Čelem vzad, přivolání do předsednutí a přiřazení přímo vlevo',
    nameEn: 'TURN AROUND, RECALL FRONT STOP, LEFT TO LEFT, STOP',
    description: [
      'Tato karta může být použita pouze po kartách 319, 408 a 409, místo kuželu pro přivolání, a musí být umístěna ve vzdálenosti 3 - 5 m od předchozí karty. Psovod se otáčí čelem vzad, zastaví se a přivolává psa. Psovod se může zastavit před otočením se čelem vzad. Psovod přivolává psa do pozice předsednutí před psovoda. Poté psovod velí psovi povel k přiřazení. Pes vykonává přiřazení přímo k levé noze psovoda, kde zaujímá pozici sedni. Pes zůstává sedět, dokud tým nepokračuje vpřed. Návrat k vedení po levé straně.',
    ],
    sequencing: {
      // p. 28: "Návrat k vedení po levé straně."
      endSide: 'left',
      // p. 28: "Tato karta může být použita pouze po kartách 319, 408 a 409".
      onlyAfterLeave: true,
    },
    image: '323',
    sourcePage: 28,
  },
]

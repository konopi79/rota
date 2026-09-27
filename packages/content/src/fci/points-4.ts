import type { Card } from '../schema'

/**
 * 4-point FCI cards. Proofread from the Czech translation of the FCI Rally Obedience
 * rules, valid from 1 Feb 2025, §5 (`sourcePage` = page of that PDF).
 */
export const FCI_FOUR_POINT_CARDS: Card[] = [
  {
    code: '401',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: '2 úkroky vpravo',
    nameEn: '2 SIDE STEPS RIGHT',
    description: [
      'Za stálého pohybu udělá psovod dva úkroky stranou vpravo. Pes jej následuje a pohybuje se současně a rovnoběžně s ním.',
    ],
    sequencing: {},
    image: '401',
    sourcePage: 29,
  },
  {
    code: '402',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: '2 úkroky vlevo',
    nameEn: '2 SIDE STEPS LEFT',
    description: [
      'Za stálého pohybu psovod udělá dva úkroky stranou vlevo. Pes jej následuje a pohybuje se současně a rovnoběžně s ním.',
    ],
    sequencing: {},
    image: '402',
    sourcePage: 29,
  },
  {
    code: '403',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: 'Stop, 2 úkroky vpravo, stop',
    nameEn: 'STOP, 2 SIDE STEPS RIGHT, STOP',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Následně psovod udělá dva úkroky vpravo a zastaví. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, po zastavení psovoda pes zaujímá pozici sedni.',
    ],
    sequencing: {},
    image: '403',
    sourcePage: 29,
  },
  {
    code: '404',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: 'Stop, 2 úkroky vlevo, stop',
    nameEn: 'STOP, 2 SIDE STEPS LEFT, STOP',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Následně psovod udělá dva úkroky vlevo a zastaví. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, po zastavení psovoda pes zaujímá pozici sedni.',
    ],
    sequencing: {},
    image: '404',
    sourcePage: 29,
  },
  {
    code: '405',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: 'Otočka od sebe',
    nameEn: 'TURN APART',
    description: [
      'Za stálého pohybu provede tým těsnou otočku o 180° přičemž se (pes i psovod) otáčí směrem od sebe a následně pokračují v opačném směru. Tato karta mění stranu vedení psa.',
    ],
    sequencing: {
      // p. 29: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '405',
    sourcePage: 29,
  },
  {
    code: '406',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Změna strany předem',
    nameEn: 'SIDE SHIFT IN FRONT',
    description: [
      'Za stálého pohybu pes před psovodem změní stranu vedení. Pes při výměně nesmí provést otočku. Tato karta mění stranu vedení psa.',
    ],
    sequencing: {
      // p. 29: "Tímto cvikem se mění strana vedení psa."
      sideChange: true,
    },
    image: '406',
    sourcePage: 29,
  },
  {
    code: '407',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Oběhnutí psovoda',
    nameEn: 'CIRCLE AROUND HANDLER',
    description: [
      'Zatímco se tým pohybuje, pes oběhne zepředu kolem psovoda a vrací se do výchozí pozice u nohy.',
    ],
    sequencing: {},
    image: '407',
    sourcePage: 29,
  },
  {
    code: '408',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Odložení do sedu, vpřed',
    nameEn: 'MOVING SIT, WALK FORWARD',
    description: [
      'Za pohybu je pes velen do pozice sedni, zatímco psovod pokračuje bez zastavení vpřed (bez psa) buď ke kuželu pro přivolání (C), kde přivolává psa (strana vedení se nemění), nebo ke kartě pro přivolání, které provede dle instrukcí na kartě uvedených. Pokud nenásleduje žádná karta pro přivolání, pak je kužel pro přivolání i samotné přivolání součástí tohoto cviku.',
    ],
    sequencing: {
      // p. 29: the recall happens at a cone, or at a following recall card.
      mayBeFollowedBy: ['321', '322', '323', '421', '422'],
    },
    image: '408',
    sourcePage: 29,
  },
  {
    code: '409',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Odložení do lehu, vpřed',
    nameEn: 'MOVING DOWN, WALK FORWARD',
    description: [
      'Za pohybu je pes velen do pozice lehni, zatímco psovod pokračuje bez zastavení vpřed (bez psa) buď ke kuželu pro přivolání (C), kde přivolává psa (strana vedení se nemění), nebo ke kartě pro přivolání, které provede dle instrukcí na kartě uvedených. Pokud nenásleduje žádná karta pro přivolání, pak je kužel pro přivolání i samotné přivolání součástí tohoto cviku.',
    ],
    sequencing: {
      // p. 30: the recall happens at a cone, or at a following recall card.
      mayBeFollowedBy: ['321', '322', '323', '421', '422'],
    },
    image: '409',
    sourcePage: 30,
  },
  {
    code: '410',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Stop, vyslání vpřed, stůj, chůze vpřed, přivolání',
    nameEn: 'STOP, SEND AWAY, STAND, WALK FORWARD, RECALL',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Týmu je při zastavení dovoleno se otočit směrem ke kuželu. Kužel je umístěn ve vzdálenosti 3 - 5 m v úhlu 90° vpravo nebo vlevo. Psovod vysílá psa, aby se zastavil u kuželu (nejméně jedna tlapka musí být ve vzdálenosti do 1 metru od kuželu). Pes zůstává stát u kuželu, zatímco psovod pokračuje vpřed směrem ke kuželu pro přivolání (C) a přivolává psa (bez změny strany vedení). Kužel pro přivolání a samotné přivolání jsou součástí tohoto cviku. Vzdálenost mezi kuželem a kuželem pro přivolání musí být minimálně 2 m.',
    ],
    sequencing: {
      equipment: ['cones'],
    },
    image: '410',
    sourcePage: 30,
  },
  {
    code: '411',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Postavení před, couvání, stůj, chůze vpřed, přivolání',
    nameEn: 'CALL FRONT STAND, BACK AWAY, STAND, WALK FORWARD, RECALL',
    description: [
      'Psovod zastaví a velí psa do pozice stůj před psovodem. Pes je poté velen k chůzi vzad (couvání) nejméně o tři délky svého těla ve směru od psovoda a zastavil se. Zatímco pes stojí, psovod přichází k psovi, kterého velí k přiřazení se (návrat k vedení vlevo) a společně bez zastavení pokračují.',
    ],
    sequencing: {
      // p. 30: "Návrat k vedení po levé straně."
      endSide: 'left',
    },
    image: '411',
    sourcePage: 30,
  },
  {
    code: '412',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: '3 kroky vzad',
    nameEn: '3 STEPS BACKWARDS',
    description: [
      'Za pohybu psovod udělá minimálně tři kroky vzad. Pes jej následuje a pohybuje se současně a rovnoběžně s ním. Jakmile tým dokončí cvik, pokračuje vpřed.',
    ],
    sequencing: {},
    image: '412',
    sourcePage: 30,
  },
  {
    code: '413',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Stop, 1 krok zpět, stůj, 2 kroky zpět, sedni, 3 kroky zpět, lehni',
    nameEn: 'STOP, 1 STEP BACK STAND, 2 STEPS BACK STOP, 3 STEPS BACK DOWN',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Následně psovod udělá 1 krok vzad a zastaví. Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici stůj. Poté psovod provede 2 kroky vzad a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici sedni. Poté psovod provede 3 kroky vzad a zastaví se. Pes se pohybuje současně a rovnoběžně s psovodem a jakmile psovod zastaví, pes zaujímá pozici lehni. Pes zůstává ležet, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '413',
    sourcePage: 30,
  },
  {
    code: '414',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: 'Stop, 90° vpravo, stůj, 90° vpravo, stůj, 90° vpravo, lehni',
    nameEn: 'STOP, 90° RIGHT TURN STAND, 90° RIGHT TURN STOP, 90° RIGHT TURN DOWN',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Následně psovod provede na místě obrat o 90° vpravo a zastaví. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, jakmile psovod zastaví, pes zaujímá pozici stůj. Poté psovod provede na místě obrat o 90° vpravo a zastaví se. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, jakmile psovod zastaví, pes zaujímá pozici sedni. Poté psovod provede na místě obrat o 90° vpravo a zastaví se. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, jakmile psovod zastaví, pes zaujímá pozici lehni. Pes zůstává ležet, dokud tým nepokračuje vpřed. Nový směr postupu je 90° vlevo od původního směru trasy.',
    ],
    sequencing: {},
    image: '414',
    sourcePage: 31,
  },
  {
    code: '415',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: 'Stop, 90° vlevo, stůj, 90° vlevo, stůj, 90° vlevo, lehni',
    nameEn: 'STOP, 90° LEFT TURN STAND, 90° LEFT TURN STOP, 90° LEFT TURN DOWN',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Následně psovod provede na místě obrat o 90° vlevo a zastaví. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, jakmile psovod zastaví, pes zaujímá pozici stůj. Poté psovod provede na místě obrat o 90° vlevo a zastaví se. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, jakmile psovod zastaví, pes zaujímá pozici sedni. Poté psovod provede na místě obrat o 90° vlevo a zastaví se. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, jakmile psovod zastaví, pes zaujímá pozici lehni. Pes zůstává ležet, dokud tým nepokračuje vpřed. Nový směr postupu je 90° vpravo od původního směru trasy.',
    ],
    sequencing: {},
    image: '415',
    sourcePage: 31,
  },
  {
    code: '416',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Předsednutí, úkrok vlevo, sedni, krok vpravo, sedni',
    nameEn: 'CALL FRONT STOP, SIDE STEP LEFT STOP, SIDE STEP RIGHT STOP',
    description: [
      'Psovod zastaví a velí psa do předsednutí. Následně provede psovod úkrok doleva a zastaví se. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, jakmile psovod zastaví, pes zaujímá pozici sedni před psovodem. Poté psovod provede úkrok doprava a zastaví se. Pes jej následuje a pohybuje se současně a rovnoběžně s ním, jakmile psovod zastaví, pes zaujímá pozici sedni před psovodem. Pes je následně naveden, aby se přiřadil k levé noze a zaujal pozici vsedě. Pes zůstává sedět, dokud tým nepokračuje v pohybu. Návrat k vedení na levé straně.',
    ],
    sequencing: {
      // p. 31: "Návrat k vedení po levé straně."
      endSide: 'left',
    },
    image: '416',
    sourcePage: 31,
  },
  {
    code: '417',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: '90° vlevo kolem kuželu',
    nameEn: '90° LEFT TURN AROUND CONE',
    description: [
      'Tento cvik může být zařazen pouze v případě, že se pes na začátku cviku nachází u levé nohy psovoda (při vedení vlevo). Za stálého pohybu týmu (dříve, než tým mine kartu cviku) psovod vysílá psa oběhnout kužel, který se nachází 1 - 2 metry od zadní strany karty cviku. Pes musí viditelně zahájit vyslání ke kuželu dříve, než psovod dosáhne karty. Zatímco pes obíhá kužel po směru hodinových ručiček, psovod udělá před kuželem obrat o 90° vlevo. Psovod může zpomalit tempo, zatímco pes obíhá kužel. Cvik končí přiřazením psa k pravé noze psovoda. Strana vedení je změněna, návrat k vedení na pravé straně.',
    ],
    sequencing: {
      // p. 31: only "při vedení vlevo"; "návrat k vedení na pravé straně".
      sideOnly: 'left',
      endSide: 'right',
      equipment: ['cones'],
    },
    image: '417',
    sourcePage: 31,
  },
  {
    code: '418',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: '90° vpravo kolem kuželu',
    nameEn: '90° RIGHT TURN AROUND CONE',
    description: [
      'Tento cvik může být zařazen pouze v případě, že se pes na začátku cviku nachází u pravé nohy psovoda (při vedení vpravo). Za stálého pohybu týmu (dříve, než tým mine kartu cviku) psovod vysílá psa oběhnout kužel, který se nachází 1 - 2 metry od zadní strany karty cviku. Pes musí být zřetelně vyslán ke kuželu dříve, než psovod dosáhne karty. Zatímco pes obíhá kužel proti směru hodinových ručiček, psovod udělá před kuželem obrat o 90° vpravo. Psovod může zpomalit tempo, zatímco pes obíhá kužel. Cvik končí přiřazením psa k levé noze psovoda. Strana vedení je změněna, návrat k vedení na levé straně.',
    ],
    sequencing: {
      // p. 32: only "při vedení vpravo"; "návrat k vedení na levé straně".
      sideOnly: 'right',
      endSide: 'left',
      equipment: ['cones'],
    },
    image: '418',
    sourcePage: 32,
  },
  {
    code: '419',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Odložení do sedu, okolo psa',
    nameEn: 'MOVING SIT, WALK AROUND',
    description: [
      'Za pohybu je pes velen do pozice sedni, zatímco psovod pokračuje bez zastavení vpřed, obchází psa zepředu, vrací se do výchozí pozice po boku psa a zastaví. Pes zůstává sedět, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '419',
    sourcePage: 32,
  },
  {
    code: '420',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 4,
    name: 'Stop, přivolání přes překážku',
    nameEn: 'STOP, RECALL OVER JUMP',
    description: [
      'Psovod zastaví vedle karty, která je umístěna 2 metry před překážkou a pes zaujímá pozici sedni u nohy psovoda. Následně psovod vychází bez psa vpřed, a jakmile míjí překážku, psa přivolává. Pes přeskakuje překážku a přiřazuje se na původní straně k psovodovi (aniž by změnil stranu vedení). Psovod může uzpůsobit tempo chůze tomu, aby psa dohnal.',
    ],
    sequencing: {
      equipment: ['jump'],
    },
    image: '420',
    sourcePage: 32,
  },
  {
    code: '421',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: 'Otočení, přivolání přes překážku se směrem',
    nameEn: 'TURN AROUND, RECALL OVER JUMP WITH DIRECTIONS',
    description: [
      'Tato karta může být použita pouze po kartách 319, 408 a 409 místo kuželu pro přivolání a musí být umístěna 8 metrů od předchozí karty. Překážka je umístěna přesně v poloviční vzdálenosti mezi touto kartou a předchozí kartou tak, že nejbližší bočnice překážky je umístěna 2 m vlevo nebo vpravo od středové linie (spojnice mezi kartami). Psovod se otáčí čelem vzad, zastavuje se a přivolává psa přes překážku do pozice ke své levé noze (bez usednutí psa). Psovod se může zastavit před otočením se čelem vzad. Tým následně pokračuje směrem vpřed. Návrat k vedení na levé straně.',
    ],
    sequencing: {
      // p. 32: "Návrat k vedení po levé straně."
      endSide: 'left',
      // p. 32: "Tato karta může být použita pouze po kartách 319, 408 a 409".
      onlyAfterLeave: true,
      equipment: ['jump'],
    },
    image: '421',
    sourcePage: 32,
  },
  {
    code: '422',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 4,
    name: 'Otočení, couvání, sedni, lehni, přivolání',
    nameEn: 'TURN AROUND, BACK AWAY, SIT, DOWN, RECALL',
    description: [
      'Tato karta může být použita pouze po kartách 319, 408 a 409 místo kuželu pro přivolání a musí být umístěna ve vzdálenosti 3 až 5 metrů od předchozí karty. Psovod se otáčí čelem vzad, zastaví se a velí psovi chůzi vzad (couvání) alespoň o 1 délku těla psa. Psovod se může zastavit před otočením se čelem vzad. Následně je pes velen do pozice sedni a poté do pozice lehni. Po vykonání pozic je pes velen do přivolání k levé noze psovoda, kde pes zaujímá pozici sedni. Pes zůstává sedět, dokud tým nepokračuje vpřed. Návrat k vedení na levé straně.',
    ],
    sequencing: {
      // p. 32: "Návrat k vedení po levé straně."
      endSide: 'left',
      // p. 32: "Tato karta může být použita pouze po kartách 319, 408 a 409".
      onlyAfterLeave: true,
    },
    image: '422',
    sourcePage: 32,
  },
]

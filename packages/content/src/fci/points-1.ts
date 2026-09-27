import type { Card } from '../schema'

/**
 * 1-point FCI cards. Proofread from the Czech translation of the FCI Rally Obedience
 * rules, valid from 1 Feb 2025, §5 (`sourcePage` = page of that PDF).
 */
export const FCI_ONE_POINT_CARDS: Card[] = [
  {
    code: '101',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: 'Lehni',
    nameEn: 'DOWN',
    description: [
      'Psovod se zastaví a pes ulehá přímo vedle psovoda. Pes zůstává ležet, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '101',
    sourcePage: 19,
  },
  {
    code: '102',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: 'Stop, lehni',
    nameEn: 'STOP, DOWN',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Psovod velí psa do pozice lehni, ve které setrvá, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '102',
    sourcePage: 19,
  },
  {
    code: '103',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: 'Stop, okolo psa',
    nameEn: 'STOP, WALK AROUND',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Zatímco pes zůstává sedět, psovod jej obchází zepředu a přiřazuje se zpět na výchozí pozici vedle psa, kde se zastaví. Pes zůstává sedět, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '103',
    sourcePage: 19,
  },
  {
    code: '104',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: 'Stop, lehni, okolo psa',
    nameEn: 'STOP, DOWN, WALK AROUND',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Psovod velí psa do pozice lehni. Zatímco pes leží, psovod jej obchází zepředu a přiřazuje se zpět na výchozí pozici vedle psa, kde se zastaví. Pes zůstává ležet, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '104',
    sourcePage: 20,
  },
  {
    code: '105',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Čelem vzad doprava',
    nameEn: 'ABOUT TURN RIGHT',
    description: ['Tým společně provede těsný obrat o 180° doprava a pokračuje v opačném směru.'],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '105',
    sourcePage: 20,
  },
  {
    code: '106',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Čelem vzad doleva',
    nameEn: 'ABOUT TURN LEFT',
    description: ['Tým společně provede těsný obrat o 180° doleva a pokračuje v opačném směru.'],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '106',
    sourcePage: 20,
  },
  {
    code: '107',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Smyčka vpravo',
    nameEn: 'LOOP RIGHT',
    description: [
      'Tým společně provede těsný obrat (smyčku) vpravo tak, že překříží původní směr trasy. Úhel obratu (smyčky) musí být mezi 180° a 270°.',
    ],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '107',
    sourcePage: 20,
  },
  {
    code: '108',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Smyčka vlevo',
    nameEn: 'LOOP LEFT',
    description: [
      'Tým společně provede těsný obrat (smyčku) vlevo tak, že překříží původní směr trasy. Úhel obratu (smyčky) musí být mezi 180° a 270°.',
    ],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '108',
    sourcePage: 20,
  },
  {
    code: '109',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: '270° vpravo',
    nameEn: '270° RIGHT',
    description: [
      'Tým společně provede těsný obrat o 270° doprava. Nový směr je 90° vlevo od původního směru trasy.',
    ],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '109',
    sourcePage: 20,
  },
  {
    code: '110',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: '270° vlevo',
    nameEn: '270° LEFT',
    description: [
      'Tým společně provede těsný obrat o 270° doleva. Nový směr je 90° vpravo od původního směru trasy.',
    ],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '110',
    sourcePage: 20,
  },
  {
    code: '111',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: '360° vpravo',
    nameEn: '360° RIGHT',
    description: [
      'Tým společně provádí těsný obrat o 360° vpravo. Tým pokračuje dále v přímém (původním) směru.',
    ],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '111',
    sourcePage: 20,
  },
  {
    code: '112',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: '360° vlevo',
    nameEn: '360° LEFT',
    description: [
      'Tým společně provádí těsnou otočku o 360° vlevo. Tým pokračuje v přímém (původním) směru.',
    ],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '112',
    sourcePage: 20,
  },
  {
    code: '113',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Čelem vzad, pes za psovodem',
    nameEn: 'TURN AROUND DOG BEHIND',
    description: [
      'Psovod provede obrat do té strany, na které se nachází pes, zatímco pes provádí obrat na tu stranu, kde se nachází psovod. Pes obchází psovoda zezadu a vrací se na výchozí stranu u nohy psovoda a společně pokračují v opačném směru.',
    ],
    sequencing: {
      // p. 19: "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
      // pomalém nebo rychlém tempu."
      paceCompatible: true,
    },
    image: '113',
    sourcePage: 21,
  },
  {
    code: '114',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Stop, 90° vpravo v bok, stop',
    nameEn: 'STOP, 90° RIGHT TURN, STOP',
    description: [
      'Psovod se zastaví a pes si sedá u nohy psovoda. Psovod provede na místě obrat vpravo v bok o 90° a zůstane stát. Pes se pohybuje společně s psovodem a současně se zastavením se psovoda znovu zaujímá pozici sed. Pes zůstává sedět, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '114',
    sourcePage: 21,
  },
  {
    code: '115',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Stop, 90° vlevo v bok, stop',
    nameEn: 'STOP, 90° LEFT TURN, STOP',
    description: [
      'Psovod se zastaví a pes usedá u nohy psovoda. Psovod provede na místě obrat vlevo v bok o 90° a zůstane stát. Pes se pohybuje společně s psovodem a současně se zastavením se psovoda znovu zaujímá pozici sed. Pes zůstává sedět, dokud tým nepokračuje vpřed.',
    ],
    sequencing: {},
    image: '115',
    sourcePage: 21,
  },
  {
    code: '116',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: 'Pomalé tempo',
    nameEn: 'SLOW PACE',
    description: [
      'Tým musí znatelně zpomalit. Pomalé tempo je nutné udržovat, dokud jiná karta neoznámí změnu tempa nebo dokud tým neprotne cílovou kartu.',
    ],
    sequencing: {
      // p. 15: pace holds "dokud jej nezmění karta s novým tempem nebo … Cíl".
      pace: 'slow',
    },
    image: '116',
    sourcePage: 21,
  },
  {
    code: '117',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: 'Rychlé tempo',
    nameEn: 'RUN',
    description: [
      'Tým musí znatelně zrychlit. Rychlé tempo je nutné udržovat, dokud jiná karta neoznámí změnu tempa nebo dokud tým neprotne cílovou kartu.',
    ],
    sequencing: {
      // p. 15: pace holds "dokud jej nezmění karta s novým tempem nebo … Cíl".
      pace: 'fast',
    },
    image: '117',
    sourcePage: 21,
  },
  {
    code: '118',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'A',
    points: 1,
    name: 'Normální tempo',
    nameEn: 'NORMAL PACE',
    description: ['Tým se vrací do normálního tempa.'],
    sequencing: {
      // p. 15: pace holds "dokud jej nezmění karta s novým tempem nebo … Cíl".
      pace: 'normal',
    },
    image: '118',
    sourcePage: 21,
  },
  {
    code: '119',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Spirála vpravo',
    nameEn: 'SPIRAL RIGHT',
    description: [
      'Tři kužely jsou umístěny v řadě za sebou ve vzdálenosti 1,5 – 2 m od sebe. Tým nejdříve obejde tři kužely po jejich levé straně, následně obejde bližší dva kužely, poté první kužel. Tým při vykonávání cviku zatáčí vpravo.',
    ],
    sequencing: {
      equipment: ['cones'],
    },
    image: '119',
    sourcePage: 21,
  },
  {
    code: '120',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Spirála vlevo',
    nameEn: 'SPIRAL LEFT',
    description: [
      'Tři kužely jsou umístěny v řadě za sebou ve vzdálenosti 1,5 – 2 m od sebe. Tým nejdříve obejde tři kužely po jejich pravé straně, následně obejde bližší dva kužely, poté první kužel. Tým při vykonávání cviku zatáčí vlevo.',
    ],
    sequencing: {
      equipment: ['cones'],
    },
    image: '120',
    sourcePage: 21,
  },
  {
    code: '121',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Jednosměrný slalom',
    nameEn: 'SINGLE SLALOM',
    description: [
      'Čtyři kužely jsou umístěny v řadě za sebou ve vzdálenosti 1,5 – 2 m od sebe. Tým začíná cvik tak, že se první kužel vždy nachází po jeho levé straně, a postupně projde (vlnovkou) mezi všemi čtyřmi kužely.',
    ],
    sequencing: {
      equipment: ['cones'],
    },
    image: '121',
    sourcePage: 21,
  },
  {
    code: '122',
    ruleset: 'FCI',
    kind: 'exercise',
    placement: 'B',
    points: 1,
    name: 'Obousměrný slalom',
    nameEn: 'DOUBLE SLALOM',
    description: [
      'Čtyři kužely jsou umístěny v řadě za sebou ve vzdálenosti 1,5 – 2 m od sebe. Tým začíná cvik tak, že se první kužel vždy nachází po jeho levé straně, a postupně projde (vlnovkou) mezi všemi čtyřmi kužely, poslední kužel obejde a prochází mezi všemi čtyřmi kužely zpět.',
    ],
    sequencing: {
      equipment: ['cones'],
    },
    image: '122',
    sourcePage: 22,
  },
]

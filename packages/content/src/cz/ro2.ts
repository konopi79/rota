import type { Card } from '../schema'

/**
 * Proofread from Zkušební řád Rally Obedience v ČR 2026, příloha 1 (`sourcePage` = page
 * of the regulation). Sequencing rules cite the regulation; see plan §5.
 */
export const RO2_CARDS: Card[] = [
  {
    code: '2-201',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – obrat vpravo o 90° – krok vpřed – stop',
    description: [
      'Tým zastaví před kartou a zaujme základní pozici. Tým provede na místě obrat vpravo o 90° a následně udělá krok vpřed. Na konci cviku tým zůstává v základní pozici.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'obrat', main: false },
      { text: 'vpravo', main: true },
      { text: 'pozice psa u nohy', main: false },
      { text: 'krok vpřed', main: true },
      { text: 'základní pozice', main: false },
    ],
    sequencing: {},
    image: '2-201',
    sourcePage: 39,
  },
  {
    code: '2-202',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – obrat vlevo o 90° – krok vpřed – stop',
    description: [
      'Tým zastaví před kartou a zaujme základní pozici. Tým provede na místě obrat vlevo o 90° a následně udělá krok vpřed. Na konci cviku tým zůstává v základní pozici.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'obrat', main: false },
      { text: 'vlevo', main: true },
      { text: 'pozice psa u nohy', main: false },
      { text: 'krok vpřed', main: true },
      { text: 'základní pozice', main: false },
    ],
    sequencing: {},
    image: '2-202',
    sourcePage: 39,
  },
  {
    code: '2-203',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – obrat o 180° vpravo – stop',
    description: [
      'Tým se zastaví před kartou a zaujme základní pozici. Následně tým provede na místě obrat o 180° vpravo (max. 4 kroky nohou) a poté zaujímá opět základní pozici.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'obrat vpravo', main: true },
      { text: 'pozice psa u nohy', main: false },
      { text: 'základní pozice', main: false },
    ],
    sequencing: {},
    image: '2-203',
    sourcePage: 40,
  },
  {
    code: '2-204',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – obrat o 180° vlevo – stop',
    description: [
      'Tým se zastaví před kartou a zaujme základní pozici. Následně tým provede na místě obrat o 180° vlevo (max. 4 kroky nohou) a poté zaujímá opět základní pozici.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'obrat vlevo', main: true },
      { text: 'pozice psa u nohy', main: false },
      { text: 'základní pozice', main: false },
    ],
    sequencing: {},
    image: '2-204',
    sourcePage: 40,
  },
  {
    code: '2-205',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stop – obrat vpravo o 180° – vpřed',
    description: [
      'Tým se zastaví před kartou a zaujme základní pozici. Tým provede na místě obrat o 180° vpravo (max. 4 kroky nohou) a pokračuje v chůzi bez zastavení k dalšímu cviku.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'obrat vpravo', main: true },
      { text: 'pozice psa u nohy', main: false },
    ],
    sequencing: {},
    image: '2-205',
    sourcePage: 40,
  },
  {
    code: '2-206',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stop – obrat vlevo o 180° – vpřed',
    description: [
      'Tým se zastaví před kartou a zaujme základní pozici. Tým provede na místě obrat o 180° vlevo (max. 4 kroky nohou) a pokračuje v chůzi bez zastavení k dalšímu cviku.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'obrat vlevo', main: true },
      { text: 'pozice psa u nohy', main: false },
    ],
    sequencing: {},
    image: '2-206',
    sourcePage: 41,
  },
  {
    code: '2-207',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – úkrok vpravo – stop',
    description: [
      'Tým se zastaví před kartou a zaujme základní pozici. Na povel psovoda provede tým úkrok vpravo (ne diagonálně), přičemž pes následuje psovoda a poté tým zaujme základní pozici. Po splnění cviku tým míjí kartu po své levé straně.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'úkrok vpravo', main: false },
      { text: 'následování psovoda psem', main: true },
      { text: 'základní pozice', main: false },
    ],
    sequencing: {},
    image: '2-207',
    sourcePage: 41,
  },
  {
    code: '2-208',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Pes okolo psovoda v pohybu',
    description: [
      'Psovod zahájí cvik v místě pro vykonání cviku tím, že velí psovi, aby jej za pohybu zepředu oběhl.',
    ],
    subParts: [
      { text: 'Psovod zůstává v pohybu', main: false },
      { text: 'Pes okolo psovoda', main: true },
    ],
    sequencing: {},
    image: '2-208',
    sourcePage: 41,
  },
  {
    code: '2-209',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – vstaň',
    description: [
      'Tým se zastaví v místě pro provedení cviku a zaujímá základní pozici. Psovod velí psa do pozice stůj.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'stůj', main: true },
      { text: 'pozice psovoda vedle psa', main: false },
    ],
    sequencing: {},
    image: '2-209',
    sourcePage: 42,
  },
  {
    code: '2-210',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – vstaň – sedni',
    description: [
      'Tým se zastaví v místě pro provedení cviku a zaujímá základní pozici. Psovod velí psa do pozice stůj a následně do pozice sedni.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'stůj', main: false },
      { text: 'sedni', main: false },
      { text: 'psovod stojí po každé pozici vedle psa', main: false },
    ],
    sequencing: {},
    image: '2-210',
    sourcePage: 42,
  },
  {
    code: '2-211',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – odložení psa v sedě',
    description: [
      'Tým se zastaví v místě pro provedení cviku a zaujímá základní pozici. Psovod odkládá psa do pozice sedni a odchází směrem k další kartě.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 2–213, 2–215, 2–216 a 2–214 s D0a–d. Pro třídu RO3 je možné použít i tyto karty: 3–320, 3–321, 3–322 a 3–319 s D0a–d.',
    ],
    subParts: [
      { text: 'základní pozice', main: true },
      { text: 'setrvání psa v pozici sedni', main: true },
    ],
    sequencing: {
      // p. 42: "Další cvik v parkuru musí být vybrán z těchto karet: …"
      nextOneOf: ['2-213', '2-215', '2-216', '2-214', '3-320', '3-321', '3-322', '3-319'],
    },
    image: '2-211',
    sourcePage: 42,
  },
  {
    code: '2-212',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Zastavit – lehni – odchod',
    description: [
      'Psovod se zastaví v místě pro provedení cviku a rovnou velí psa do pozice lehni. Pes se nesmí posadit ani zůstat stát. Psovod odchází k dalšímu cviku, zatímco pes setrvává odložen.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 2–213, 2–215, 2–216 a 2–214 s D0a–d. Pro třídu RO3 je možné použít i tyto karty: 3–302, 3–320 a 3–308, 3–319 s D0a–d.',
    ],
    subParts: [
      { text: 'psovod stojí, pes do lehu', main: true },
      { text: 'setrvání psa v pozici', main: true },
    ],
    sequencing: {
      // p. 43: "Další cvik v parkuru musí být vybrán z těchto karet: …"
      nextOneOf: ['2-213', '2-215', '2-216', '2-214', '3-302', '3-320', '3-308', '3-319'],
    },
    image: '2-212',
    sourcePage: 43,
  },
  {
    code: '2-213',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Otočení – zpět ke psu',
    description: [
      'V místě pro vykonání cviku se psovod otáčí čelem ke psu a následně se k němu vrací a postaví se vedle psa tak, jak tomu bylo u předchozího cviku.',
    ],
    subParts: [{ text: 'psovod se postaví vedle psa', main: false }],
    sequencing: {
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '2-213',
    sourcePage: 43,
  },
  {
    code: '2-214',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Otočení – přivolání do předsednutí',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'Před kartou se psovod otočí čelem ke psovi. Poté jej přivolá do předsednutí. Během předsednutí a při provádění cviku z doplňkové karty nesmí psovod pohybovat nohama.',
    ],
    subParts: [
      { text: 'Závěrečné předsednutí', main: true },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 43: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '2-214',
    sourcePage: 43,
  },
  {
    code: '2-215',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Bez otočení – přivolání k noze',
    description: [
      'Psovod se zastaví v místě pro vykonání cviku a přivolává psa do pozice k levé noze. Při provádění přivolání může psovod pohybovat pouze horní částí těla, nohy musí zůstat na místě ve směru předchozího pohybu. Jakmile pes dosáhne pozice u nohy, odchází tým na další stanoviště, aniž by si pes předem sedl.',
    ],
    subParts: [
      { text: 'postoj psovoda ve směru chůze', main: true },
      { text: 'společný odchod týmu', main: false },
    ],
    sequencing: {
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '2-215',
    sourcePage: 44,
  },
  {
    code: '2-216',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Otočení – přivolání k noze',
    description: [
      'Před kartou se psovod otočí čelem ke psovi. Poté jej přivolá k levé noze (způsob přiřazení není daný). Při dosažení pozice u nohy, rozchází se tým k dalšímu cviku (aniž by pes sedl).',
    ],
    subParts: [
      { text: 'postoj psovoda ve směru chůze', main: true },
      { text: 'společný odchod týmu', main: false },
    ],
    sequencing: {
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '2-216',
    sourcePage: 44,
  },
  {
    code: '2-217',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Skok přes překážku – psovod těsně vedle překážky',
    description: [
      'Skok se provádí přes laťkovou překážku. Karta cviku může být na libovolné straně postupu psovoda, minimálně však 5 metrů před překážkou. Cvik začíná v místě pro provedení cviku, kdy tým chůzí u nohy pokračuje směrem k překážce. Ústní a/nebo posunkový povel k překonání překážky může psovod dát i za místem pro vykonání cviku. Psovod vysílá psa na překážku a dává povel k jejímu překonání, zatímco on překážku míjí. Jakmile pes překoná překážku, psovod velí psa k noze a pokračují společně k dalšímu cviku. Pokud je pes při překonávání rychlejší než psovod, může být psovodem přivolán zpět k noze a pokračují společně k dalšímu cviku. Následné karty jsou umístěny ve vzdálenosti minimálně 5 metrů od překážky',
    ],
    subParts: [
      { text: 'skok psa', main: true },
      { text: 'psovod bez zastavení podél překážky do přiřazení psa', main: true },
      { text: 'laťka nespadne', main: false },
    ],
    sequencing: {
      equipment: ['jump'],
    },
    image: '2-217',
    sourcePage: 44,
  },
  {
    code: '2-218',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Z poslední pozice – odchod k přivolání přes překážku',
    description: [
      'Tato karta musí být použita v kombinaci se statickým cvikem (typ A) a musí být umístěna minimálně 5 metrů před překážkou. Psovod odkládá psa (v původní pozici z poslední karty) a odchází podél překážky k další kartě. Způsob přivolání přes překážku určují karty: 2–215, 2–216 a 2–214 s D0a–d. Pro třídu RO 3 je možné použít i kartu 3–319 s D0a–d.',
    ],
    subParts: [
      { text: 'pes zůstává v pozici do přivolání psovodem', main: true },
      { text: 'skok psa', main: true },
      { text: 'laťka nespadne', main: false },
    ],
    sequencing: {
      // p. 45: "Způsob přivolání přes překážku určují karty: 2–215, 2–216 a 2–214 s D0a–d.
      // Pro třídu RO 3 je možné použít i kartu 3–319 s D0a–d."
      nextOneOf: ['2-215', '2-216', '2-214', '3-319'],
      // p. 45: follows a static exercise (typ A).
      afterStatic: true,
      equipment: ['jump'],
    },
    image: '2-218',
    sourcePage: 45,
  },
  {
    code: '2-219',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Pes otočka vně od psovoda – za pohybu',
    description: [
      'V místě pro vykonání cviku psovod velí psovi povel pro provedení otočky vně od psovoda. Po dokončení otočky se pes vrací k noze. Cvik se provádí za nepřerušované chůze.',
    ],
    subParts: [
      { text: 'pes se otáčí vně od psovoda', main: true },
      { text: 'psovod zůstává v pohybu', main: true },
    ],
    sequencing: {},
    image: '2-219',
    sourcePage: 45,
  },
  {
    code: '2-220',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Slalom tam a zpět s rušivým vlivem',
    description: [
      'Dva kužely a dvě misky jsou rozestavěny v řadě za sebou s rozestupem 1,5 m od sebe tak, že misky jsou v řadě umístěny mezi kužely. V jedné misce se nachází aromatické pamlsky, ve druhé dobře viditelné hračky, obě misky musí být zakryté. Karta je umístěna před prvním kuželem, viditelná ze směru příchodu týmu. Tým vstupuje do slalomu vždy zprava (tj. první kužel po levé straně psa). A překoná jej ve směru tam i zpět. Směr postupu ze slalomu závisí na poloze další karty. V případě pozření pamlsků, převrácení misky nebo krytu, již není možné cvik opakovat a je tudíž nesplněn (-10 bodů).',
    ],
    subParts: [
      { text: 'vstup správnou stranou do slalomu', main: false },
      { text: 'psovod a pes společně kolem kuželů', main: false },
      { text: 'slalom tam a zpět', main: true },
      { text: 'míjení misky, aniž by byla převržena nebo pes chňapal po poklopu', main: true },
      {
        text: 'Nebude-li hlavní cvik předveden, hodnocení je -10 bodů, bez možnosti opakování!',
        main: false,
      },
    ],
    sequencing: {
      equipment: ['cones', 'bowls'],
    },
    image: '2-220',
    sourcePage: 45,
  },
  {
    code: '2-221',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Stůj před psovodem – 1, 2, 3 kroky zpět',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'V místě pro provedení cviku dává psovod psovi povel pro pozici stůj před psovodem. Během pohybu psa (než zaujme pozici stůj) může psovod udělat až čtyři kroky vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Poté co pes zaujme pozici před psovodem, provede psovod jeden krok vzad, pes jej následuje a zaujímá pozici stůj před psovodem. Následně psovod provede dva kroky vzad, pes jej následuje a zaujímá pozici stůj před psovodem. Dále psovod provede tři kroky vzad, pes jej následuje a zaujímá pozici stůj před psovodem. Během zaujímání pozic před psovodem a provádění cviku z doplňkové karty nesmí psovod pohybovat nohama.',
    ],
    subParts: [
      { text: '4x stůj před psovodem', main: false },
      { text: 'následování pohybu vzad', main: false },
      { text: '1, 2, 3 kroky vzad', main: false },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 46: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
    },
    image: '2-221',
    sourcePage: 46,
  },
  {
    code: '2-222',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Předsednutí – úkrok vlevo – úkrok vpravo – předsednutí',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'V místě pro vykonání cviku dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat až čtyři kroky vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Jakmile pes zaujme pozici před psovodem, psovod udělá znatelný úkrok doleva (ne diagonálně), přičemž pes jej následuje a končí v předsednutí před psovodem. Následně psovod provede znatelný úkrok doprava (ne diagonálně), přičemž jej pes opět následuje a končí v předsednutí před psovodem. Po splnění cviku na doplňkové kartě tým míjí kartu po své pravé straně.',
    ],
    subParts: [
      { text: '3 x předsednout s ukončením', main: false },
      { text: 'cvik vlevo', main: false },
      { text: 'cvik vpravo', main: false },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 46: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
    },
    image: '2-222',
    sourcePage: 46,
  },
  {
    code: '2-223',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stůj – obrat vpravo o 90° – stůj',
    description: [
      'Tým zastaví před kartou, pes je v pozici stůj vedle nohy psovoda. Tým provede na místě obrat vpravo o 90°. Na konci cviku pes zůstává opět v pozici stůj.',
    ],
    subParts: [
      { text: '2x psovod stojí, pes stojí u nohy', main: false },
      { text: 'úhel (90°)', main: false },
      { text: 'vpravo', main: true },
      { text: 'pes zůstane v pozici u nohy', main: false },
    ],
    sequencing: {},
    image: '2-223',
    sourcePage: 47,
  },
  {
    code: '2-224',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stůj – obrat vlevo o 90° – stůj',
    description: [
      'Tým zastaví před kartou, pes je v pozici stůj vedle nohy psovoda. Tým provede na místě obrat vlevo o 90°. Na konci cviku pes zůstává opět v pozici stůj.',
    ],
    subParts: [
      { text: '2x psovod stojí, pes stojí u nohy', main: false },
      { text: 'úhel (90 °)', main: false },
      { text: 'vlevo', main: true },
      { text: 'pes zůstane v pozici u nohy', main: false },
    ],
    sequencing: {},
    image: '2-224',
    sourcePage: 47,
  },
  {
    code: '2-225',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stůj – obrat vpravo o 180° – vpřed',
    description: [
      'Tým zastaví před kartou, pes je v pozici stůj vedle nohy psovoda. Tým provede na místě obrat o 180° vpravo (max. 4 kroky nohou) a pokračuje v chůzi bez zastavení k dalšímu cviku.',
    ],
    subParts: [
      { text: 'psovod stojí, pes stojí u nohy', main: false },
      { text: 'obrat vpravo o 180°', main: true },
      { text: 'pes zůstane v pozici u nohy', main: false },
    ],
    sequencing: {},
    image: '2-225',
    sourcePage: 47,
  },
  {
    code: '2-226',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stůj – obrat vlevo o 180° – vpřed',
    description: [
      'Tým zastaví před kartou, pes je v pozici stůj vedle nohy psovoda. Tým provede na místě obrat o 180° vlevo (max. 4 kroky nohou) a pokračuje v chůzi bez zastavení k dalšímu cviku.',
    ],
    subParts: [
      { text: 'psovod stojí, pes stojí u nohy', main: false },
      { text: 'obrat vlevo o 180°', main: true },
      { text: 'pes zůstane v pozici u nohy', main: false },
    ],
    sequencing: {},
    image: '2-226',
    sourcePage: 48,
  },
  {
    code: '2-227',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stůj - 1, 2, 3, kroky vpřed',
    description: [
      'Tým zastaví u karty v místě pro vykonání cviku, pes je v pozici stůj. Tým provede společně posun o jeden krok vpřed, zastaví se a pes zůstává stát. Dále tým provede dva kroky vpřed, zastaví se a pes zůstává stát. Následně tým provede tři kroky vpřed, zastaví se a pes zůstává stát. Při všech posunech vpřed pes vždy následuje psovoda.',
    ],
    subParts: [
      { text: '1, 2, 3 kroky u nohy', main: false },
      { text: 'následování kroků vpřed', main: false },
      { text: '4x stůj', main: false },
    ],
    sequencing: {},
    image: '2-227',
    sourcePage: 48,
  },
  {
    code: '2-228',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop - 1 krok vzad - stop',
    description: [
      'Tým zastaví u karty v místě pro vykonání cviku a zaujímá základní pozici. Psovod udělá krok vzad a pes jej couváním následuje. Poté tým opět zaujímá základní pozici.',
    ],
    subParts: [
      { text: '2x základní pozice', main: false },
      { text: '1 krok zpět', main: false },
      { text: 'Pes následuje psovoda', main: false },
    ],
    sequencing: {},
    image: '2-228',
    sourcePage: 48,
  },
  {
    code: '2-229',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop - úkrok vlevo - stop',
    description: [
      'Tým se zastaví před kartou a zaujme základní pozici. Na povel psovoda provede tým úkrok vlevo (ne diagonálně), přičemž pes následuje psovoda a poté tým zaujme základní pozici. Po splnění cviku tým míjí kartu po své pravé straně.',
    ],
    subParts: [
      { text: '2x základní pozice', main: false },
      { text: 'úkrok vlevo', main: false },
      { text: 'následování psovoda psem', main: true },
    ],
    sequencing: {},
    image: '2-229',
    sourcePage: 49,
  },
  {
    code: '2-230',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop - obrat vpravo - 1 krok - přivolání - stop',
    description: [
      'Tým se zastaví před kartou a zaujme základní pozici. Pes zůstává v odložení. Psovod se otáčí vpravo o 90° a udělá 1 krok. Poté je pes přivolán do základní pozice.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'odložení psa', main: true },
      { text: '90° vpravo', main: true },
      { text: '1 krok vpřed', main: true },
      { text: 'přivolání do základní pozice', main: false },
    ],
    sequencing: {},
    image: '2-230',
    sourcePage: 49,
  },
  {
    code: '2-231',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop - obrat vlevo - 1 krok - přivolání - stop',
    description: [
      'Tým se zastaví před kartou a zaujme základní pozici. Pes zůstává v odložení. Psovod se otáčí vlevo o 90° a udělá 1 krok. Poté je pes přivolán do základní pozice.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'odložení psa', main: true },
      { text: '90° vlevo', main: true },
      { text: '1 krok vpřed', main: true },
      { text: 'přivolání do základní pozice', main: false },
    ],
    sequencing: {},
    image: '2-231',
    sourcePage: 49,
  },
  {
    code: '2-232',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Obrat proti sobě',
    description: [
      'Tým před kartou vykoná obrat o 180° směrem k sobě. Jakmile se pes nachází u druhé nohy psovoda, tým se rozchází novým směrem.',
    ],
    subParts: [
      { text: 'Pes a psovod se pohybují proti sobě', main: true },
      { text: 'Psovod je stále v pohybu', main: false },
      { text: 'Pes změní stranu vedení', main: true },
    ],
    sequencing: {
      // p. 50: the dog changes the heeling side.
      sideChange: true,
    },
    image: '2-232',
    sourcePage: 50,
  },
]

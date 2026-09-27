import type { Card } from '../schema'

/**
 * Proofread from Zkušební řád Rally Obedience v ČR 2026, příloha 1 (`sourcePage` = page
 * of the regulation). Sequencing rules cite the regulation; see plan §5.
 */
export const RO3_CARDS: Card[] = [
  {
    code: '3-301',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – odložení vsedě – psovod šikmo',
    description: [
      'Karta může být libovolně vlevo nebo vpravo trasy psovoda. Tým zaujímá základní pozici. Na pokyn psovoda pes zůstává na místě a psovod odchází k následující kartě.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 3–302 a D0a–d, 3–319 a D0a–d, 2–215, 2–216.',
      'Karty jsou umístěny minimálně 3 metry od sebe. Další cviky jsou posunuty o 180 cm vpravo nebo vlevo od konce místa cviku.',
    ],
    subParts: [
      { text: 'základní pozice', main: true },
      { text: 'pes zůstává v pozici až do přivolání', main: true },
    ],
    sequencing: {
      // p. 51: "Další cvik v parkuru musí být vybrán z těchto karet: …"
      nextOneOf: ['3-302', '3-319', '2-215', '2-216'],
    },
    image: '3-301',
    sourcePage: 51,
  },
  {
    code: '3-302',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Otočení – přivolání z úhlu do předsednutí',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'Psovod se otáčí před kartou a přivolá psa do předsednutí. Tato karta je minimálně 3 metry vzdálená od předchozí karty a je posunutá přibližně 180 cm stranou vlevo nebo vpravo od konce místa pro vykonání cviku předchozí karty tak, že pes musí přijít do předsednutí z úhlu.',
      'V kombinaci s kartou 3-314 by měla být vzdálenost mezi kartami minimálně 10 metrů.',
    ],
    subParts: [
      { text: 'nohy psovoda ukazují do směru pohybu', main: true },
      { text: 'předsednutí', main: true },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 51: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '3-302',
    sourcePage: 51,
  },
  {
    code: '3-303',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Zastavit – stůj – okolo psa',
    description: [
      'Tým se zastaví v místě pro vykonání cviku a pes zůstane stát u nohy psovoda, aniž by předtím zaujal polohu sedni. Následně psovod obejde stojícího psa zepředu, postaví se opět vedle něj a krátce se v pozici zdrží. Pes po celou dobu cviku musí zůstat stát.',
    ],
    subParts: [
      { text: 'zastavit', main: true },
      { text: 'stůj bez předchozího sedni nebo lehni', main: true },
      { text: 'psovod okolo psa, pes zůstává v pozici', main: true },
      { text: 'psovod stojí na konci vedle psa', main: false },
    ],
    sequencing: {},
    image: '3-303',
    sourcePage: 52,
  },
  {
    code: '3-304',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – stůj – lehni',
    description: [
      'Tým se zastaví v místě pro vykonání cviku a zaujímá základní pozici. Psovod velí psa do pozice stůj. Jakmile se pes postaví, velí psovod psa do pozice lehni.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'stůj', main: false },
      { text: 'lehni', main: false },
      { text: 'psovod stojí po každé pozici vedle psa', main: false },
    ],
    sequencing: {},
    image: '3-304',
    sourcePage: 52,
  },
  {
    code: '3-305',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – lehni – vstaň',
    description: [
      'Tým se zastaví v místě pro vykonání cviku a zaujímá základní pozici. Psovod velí psa do pozice lehni a následně do pozice stůj.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'lehni, stůj', main: false },
      { text: 'psovod stojí po každé pozici vedle psa', main: false },
    ],
    sequencing: {},
    image: '3-305',
    sourcePage: 52,
  },
  {
    code: '3-306',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Zastavení – 3 kroky vzad – vpřed',
    description: [
      'Tým se zastaví v místě pro vykonání cviku a pes zůstane stát u nohy psovoda, aniž by si předtím sedl. Tým provede 3 zřetelné kroky vzad, pes po celou dobu následuje psovoda, přičemž si nesmí sedat nebo jít stranou. Následně jde tým vpřed k dalšímu cviku.',
    ],
    subParts: [
      { text: 'psovod zastaví, pes stojí', main: true },
      { text: 'psovod vzad, pes vzad u nohy psovoda, aniž by se posadil', main: true },
    ],
    sequencing: {},
    image: '3-306',
    sourcePage: 53,
  },
  {
    code: '3-307',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Zastavit – odložení ve stoje – odchod',
    description: [
      'Tým se zastaví v místě pro vykonání cviku a pes zůstane stát u nohy psovoda, aniž by si předtím sedl. Psovod velí psovi zůstat ve stoje a odchází k další kartě.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 2-213, 2-215, 2-216, 3-320, 3-321, 3-322, a také 2-214, 3-302, 3-308, 3-309, 3-319 s doplňkovou kartou D0a–d.',
    ],
    subParts: [
      { text: 'psovod zastaví, pes stojí', main: true },
      { text: 'pes zůstává v pozici', main: true },
    ],
    sequencing: {
      // p. 53: "Další cvik v parkuru musí být vybrán z těchto karet: …"
      nextOneOf: [
        '2-213',
        '2-215',
        '2-216',
        '3-320',
        '3-321',
        '3-322',
        '2-214',
        '3-302',
        '3-308',
        '3-309',
        '3-319',
      ],
    },
    image: '3-307',
    sourcePage: 53,
  },
  {
    code: '3-308',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Otočení – přivolání s položením – přivolání do předsednutí',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'Psovod se otáčí před kartou a přivolá psa. Když je pes v pohybu velí psovod psa do pozice lehni. Pes musí zaujmout polohu nejpozději do ⅔ vzdálenosti ke psovodovi (vzdálenost ⅔ je označena). Jakmile pes zaujme polohu, je opět psovodem přivolán do předsednutí. Během předsednutí a při provádění doplňkových cviků psovod nesmí hýbat nohama.',
    ],
    subParts: [
      { text: 'pes přibíhá znatelně po přivolání', main: true },
      { text: 'pes si před značkou lehá', main: true },
      { text: 'předsednutí', main: true },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 53: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '3-308',
    sourcePage: 53,
  },
  {
    code: '3-309',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Otočení – polohy lehni, sedni na dálku – přivolání do předsednutí',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'Psovod se otáčí před kartou a velí psa do pozice lehni. Jakmile pes zaujme polohu, dostává další povel k zaujetí pozice sedni. Pes by měl změny poloh vykonat, pokud možno na místě. Jakmile pes sedí, psovod jej přivolává do předsednutí. Během předsednutí a při provádění doplňkových cviků psovod nesmí hýbat nohama.',
    ],
    subParts: [
      { text: 'pes do lehu, pes do sedu', main: true },
      { text: 'předsednutí', main: true },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 54: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '3-309',
    sourcePage: 54,
  },
  {
    code: '3-310',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Odložení za pochodu do sedu',
    description: [
      'V místě pro vykonání cviku psovod, aniž by se zastavil, odkládá psa do sedu. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Pes musí zaujmout danou pozici zhruba do vzdálenosti jedné délky svého těla. Psovod pokračuje k další kartě.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 2-213, 2-215, 2-216, 3-320, 3-321, 3-322, a také 2-214, 3-302, 3-308, 3-309, 3-319 s doplňkovou kartou D0a–d.',
    ],
    subParts: [
      { text: 'pes zaujme sedni v rámci jedné tělesné délky', main: true },
      { text: 'pes zůstává v pozici', main: true },
      { text: 'psovod dodržuje pohyb vpřed', main: true },
    ],
    sequencing: {
      // p. 54: "Další cvik v parkuru musí být vybrán z těchto karet: …"
      nextOneOf: [
        '2-213',
        '2-215',
        '2-216',
        '3-320',
        '3-321',
        '3-322',
        '2-214',
        '3-302',
        '3-308',
        '3-309',
        '3-319',
      ],
    },
    image: '3-310',
    sourcePage: 54,
  },
  {
    code: '3-311',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Odložení za pochodu do lehu',
    description: [
      'V místě pro vykonání cviku psovod, aniž by se zastavil, odkládá psa do lehu. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Pes musí zaujmout danou pozici zhruba do vzdálenosti jedné délky svého těla. Psovod pokračuje k další kartě.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 2-213, 2-215, 2-216, 3-320, 3-321, a také 2-214, 3-302, 3-308, 3-319 s doplňkovou kartou D0a–d.',
    ],
    subParts: [
      { text: 'pes zaujme lehni v rámci jedné tělesné délky', main: true },
      { text: 'pes zůstává v pozici', main: true },
      { text: 'psovod dodržuje pohyb vpřed', main: true },
    ],
    sequencing: {
      // p. 55: "Další cvik v parkuru musí být vybrán z těchto karet: …" — 3-322 and 3-309
      // are struck through here (unlike 3-310/3-312): both start with a down, and the dog
      // is already down.
      nextOneOf: ['2-213', '2-215', '2-216', '3-320', '3-321', '2-214', '3-302', '3-308', '3-319'],
    },
    image: '3-311',
    sourcePage: 55,
  },
  {
    code: '3-312',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Odložení za pochodu do stoje',
    description: [
      'V místě pro vykonání cviku psovod, aniž by se zastavil, odkládá psa do stoje. Psovod se během odkládání psa smí otočit tělem ke psu, ale přitom se musí stále pohybovat vpřed. Pes musí zaujmout danou pozici zhruba do vzdálenosti jedné délky svého těla. Psovod pokračuje k další kartě.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 2-213, 2-215, 2-216, 3-320, 3-321, 3-322, a také 2-214, 3-302, 3-308, 3-309, 3-319 s doplňkovou kartou D0a–d.',
    ],
    subParts: [
      { text: 'pes zaujme stůj v rámci jedné tělesné délky', main: true },
      { text: 'pes zůstává v pozici', main: true },
      { text: 'psovod dodržuje pohyb vpřed', main: true },
    ],
    sequencing: {
      // p. 55: "Další cvik v parkuru musí být vybrán z těchto karet: …"
      nextOneOf: [
        '2-213',
        '2-215',
        '2-216',
        '3-320',
        '3-321',
        '3-322',
        '2-214',
        '3-302',
        '3-308',
        '3-309',
        '3-319',
      ],
    },
    image: '3-312',
    sourcePage: 55,
  },
  {
    code: '3-313',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Pes přes překážku – psovod ve vzdálenosti',
    description: [
      'Skok se provádí přes laťkovou překážku. Karta cviku může být na libovolné straně postupu psovoda, minimálně však 5 metrů před překážkou. Cvik začíná v místě pro provedení cviku, kdy tým chůzí u nohy pokračuje směrem k překážce. Ústní a/nebo posunkový povel k překonání překážky může psovod dát i za místem pro vykonání cviku. Psovod vysílá psa na překážku a dává povel k jejímu překonání, zatímco sám překážku míjí za vyznačenou linií ve vzdálenosti cca 1,8 m. Jakmile pes překoná překážku, psovod velí psa k té noze, od které byl původně vyslán, a pokračují společně k dalšímu cviku. Pokud je pes při překonávání rychlejší než psovod, může být psovodem přivolán zpět k noze a pokračují společně k dalšímu cviku. Následné karty jsou umístěny ve vzdálenosti minimálně 5 metrů od překážky.',
    ],
    subParts: [
      { text: 'psovod je v pohybu, dokud se pes nepřiřadí k noze', main: true },
      { text: 'psovod zůstane vedle vyznačené linie', main: true },
      { text: 'pes skáče', main: true },
      { text: 'laťka nespadne', main: false },
    ],
    sequencing: {
      equipment: ['jump'],
    },
    image: '3-313',
    sourcePage: 56,
  },
  {
    code: '3-314',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Z poslední pozice – přivolání přes překážku',
    description: [
      'Karta může být umístěna libovolně vlevo nebo vpravo od trasy psovoda. Tato karta následuje vždy po kartě se statickým cvikem (typ A) a musí být umístěna minimálně 5 metrů před překážkou. Překážka se nachází přibližně 180 cm vpravo nebo vlevo od konce místa pro vykonání cviku. Psovod odkládá psa v konečné pozici z posledního cviku a odchází podél překážky k následující kartě.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 3-302, 3-319 D0a-d a 2-215, 2-216. Tyto karty se nacházení minimálně 5 metrů od překážky a jsou posunuty o 180 cm vpravo či vlevo.',
    ],
    subParts: [
      { text: 'pes je v pozici, dokud není přivolán', main: true },
      { text: 'pes skáče', main: true },
      { text: 'psovod jde podél překážky', main: true },
      { text: 'laťka nespadne', main: false },
    ],
    sequencing: {
      // p. 56: "Další cvik v parkuru musí být vybrán z těchto karet: …"
      nextOneOf: ['3-302', '3-319', '2-215', '2-216'],
      // p. 56: follows a static exercise (typ A).
      afterStatic: true,
      equipment: ['jump'],
    },
    image: '3-314',
    sourcePage: 56,
  },
  {
    code: '3-315',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Pes otočka od psovoda – psovod otočka od psa',
    description: [
      'V místě pro vykonání cviku psovod velí psovi povel pro provedení otočky vně od psovoda a současně psovod vykonává otočku směrem od psa. Po dokončení otoček se tým střetává v pozici u nohy a pokračují k další kartě. Cvik se provádí za nepřerušované chůze.',
    ],
    subParts: [
      { text: 'pes se otáčí od psovoda, psovod současně od psa', main: true },
      { text: 'psovod zůstává v pohybu', main: true },
    ],
    sequencing: {},
    image: '3-315',
    sourcePage: 57,
  },
  {
    code: '3-316',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stůj – obrat vpravo o 180° – stůj',
    description: [
      'Tým zastaví před kartou, pes zůstává stát vedle nohy psovoda. Tým provede na místě obrat o 180° vpravo (max. 4 kroky nohou). Na konci cviku pes zůstává opět v pozici stůj.',
    ],
    subParts: [
      { text: 'psovod zůstane 2x stát, pes se řadí k noze', main: false },
      { text: 'obrat vpravo o 180°', main: true },
      { text: 'pes zůstává u nohy', main: false },
    ],
    sequencing: {},
    image: '3-316',
    sourcePage: 57,
  },
  {
    code: '3-317',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stůj – obrat vlevo o 180° – stůj',
    description: [
      'Tým zastaví před kartou, pes zůstává stát vedle nohy psovoda. Tým provede na místě obrat o 180° vlevo (max. 4 kroky nohou). Na konci cviku pes zůstává opět v pozici stůj.',
    ],
    subParts: [
      { text: 'psovod zůstane 2x stát, pes se řadí k noze', main: false },
      { text: 'obrat vlevo o 180°', main: true },
      { text: 'pes zůstává u nohy', main: false },
    ],
    sequencing: {},
    image: '3-317',
    sourcePage: 57,
  },
  {
    code: '3-318',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Zastavení do stoje – pes okolo psovoda – stůj',
    description: [
      'Tým se zastaví v místě pro vykonání cviku a pes zůstane stát u nohy psovoda, aniž by si předtím sedl. Pes obchází zepředu psovoda a opět se zastavuje ve stoje u nohy psovoda. Psovod zůstává celou dobu cviku stát a nesmí hýbat nohama.',
    ],
    subParts: [
      { text: 'psovod se zastaví, pes stojí', main: true },
      { text: 'pes obejde psovoda', main: true },
      { text: 'pes se přiřadí k noze do stoje', main: false },
    ],
    sequencing: {},
    image: '3-318',
    sourcePage: 58,
  },
  {
    code: '3-319',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Bez otočení do předsednutí',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'V místě pro vykonání cviku se psovod zastaví (neotáčí se) a přivolá psa do předsednutí. Psovod může pohnout horní polovinou těla, ale nohy musí zůstat ve směru původního pohybu. Pes musí přijít do předsednutí z té strany, na které se nacházel u předchozího odkládacího cviku. Jakmile se pes dostane na úroveň nohy psovoda a než si pes předsedne, může psovod udělat až čtyři kroky vzad v přímém směru, aby psovi předsednutí ulehčil, ale nesmí úkrokem do strany korigovat pozici psa. Během předsednutí a během provádění cviku z doplňkové karty nesmí psovod pohybovat nohama.',
    ],
    subParts: [
      { text: 'psovod zůstane stát, dokud pes nedosáhne úrovně jeho nohou', main: true },
      { text: 'příchod psa ze správné (původní) strany', main: false },
      { text: 'předsednutí', main: true },
      { text: 'nohy psovoda směřují do směru pohybu', main: true },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 58: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '3-319',
    sourcePage: 58,
  },
  {
    code: '3-320',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Otočení – přivolání s položením – návrat ke psu',
    description: [
      'V místě pro vykonání cviku se psovod otočí a následně přivolá psa. Jakmile je pes v pohybu velí psovod psa do pozice lehni. Pes musí zaujmout polohu nejpozději do ⅔ vzdálenosti ke psovodovi (vzdálenost ⅔ je označena). Jakmile pes zaujme polohu v leže, psovod se vrací ke psu a postaví se na stejnou stranu u nohy jako u předchozího odkládacího cviku.',
    ],
    subParts: [
      { text: 'pes po přivolání znatelně vybíhá vpřed', main: true },
      { text: 'pes si lehne před značkou', main: true },
      { text: 'pes zůstane v lehu, dokud se psovod nepostaví vedle psa', main: true },
      {
        text: 'psovod se vrací ke psu a postaví se na stejnou stranu jako u předchozího odkládacího cviku',
        main: false,
      },
    ],
    sequencing: {
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '3-320',
    sourcePage: 59,
  },
  {
    code: '3-321',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Otočení – přivolání s položením – přivolání k noze',
    description: [
      'Před kartou se psovod otočí a následně přivolá psa. Jakmile je pes v pohybu, velí psovod psa do pozice lehni. Pes musí zaujmout polohu nejpozději do ⅔ vzdálenosti ke psovodovi (vzdálenost ⅔ je označena). Jakmile pes zaujme polohu, je opět psovodem přivolán k noze. Pokud je pes v pozici u nohy, tým pokračuje (aniž by si pes sedl) k další kartě.',
      'Během přivolání nesmí psovod hýbat nohama.',
    ],
    subParts: [
      { text: 'pes po přivolání znatelně vybíhá vpřed', main: true },
      { text: 'pes si lehne před značkou', main: true },
      { text: 'pes se přiřadí k noze', main: true },
    ],
    sequencing: {
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '3-321',
    sourcePage: 59,
  },
  {
    code: '3-322',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Otočení – polohy lehni, sedni na dálku – návrat ke psu',
    description: [
      'V místě pro vykonání cviku se psovod otočí a následně velí psa (na dálku) do polohy lehni. Jakmile pes zaujme polohu vleže, dostává další povel (na dálku) do polohy sedni. Pes by měl polohy zaujímat, pokud možno na místě. Psovod při velení nesmí hýbat nohama. Jakmile pes zaujme polohu v sedě, psovod se vrací ke psu a postaví se na stejnou stranu u nohy jako u předchozího odkládacího cviku.',
    ],
    subParts: [
      { text: 'pes do lehu, pes do sedu', main: true },
      { text: 'pes zůstane v sedu, dokud se psovod nepostaví vedle psa', main: true },
      {
        text: 'psovod se vrací ke psu a postaví se do pozice jako u předchozího odkládacího cviku',
        main: false,
      },
    ],
    sequencing: {
      // Listed as the follow-up of a leave card — never dealt on its own.
      onlyAfterLeave: true,
    },
    image: '3-322',
    sourcePage: 60,
  },
  {
    code: '3-323',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Stop – odběhnutí – přivolání do předsednutí za klusu',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'Cvik vyžaduje minimální vzdálenost 8 m k dalšímu cviku.',
      'Tým se zastaví v místě pro vykonání cviku a zaujme základní pozici. Psovod dává povel psovi k setrvání na místě a odbíhá od něj přímým směrem (zády ke psu) a minimálně po 3 krocích běhu jej za běhu přivolává do předsednutí. Pes musí okamžitě reagovat a vyběhnout za psovodem. Jakmile pes dosáhne úrovně nohy psovoda, smí provést až 4 kroky zpět tak, aby psovi předsednutí usnadnil. Během předsednutí a při provádění doplňkových cviků psovod nesmí hýbat nohama. Rychlost, kterou se psovod pohybuje vpřed, je závislá na možnostech psa ho dostihnout. Běh musí být zřetelně odlišitelný od normálního tempa.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'okamžité rychlé tempo psovoda', main: true },
      { text: 'pes zůstává sedět', main: true },
      { text: 'psovod v pohybu, dokud pes nedosáhne jeho úrovně', main: true },
      { text: 'předsednutí', main: true },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 60: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
    },
    image: '3-323',
    sourcePage: 60,
  },
  {
    code: '3-324',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Vyslání ke kuželu – stůj',
    description: [
      'V místě pro vykonání cviku tým zaujme základní pozici ve směru kužele, který je umístěn 5 m na stranu od konce místa pro vykonání cviku. Psovod vysílá psa ke kuželu. V okruhu max. 1 m od kužele je pes zastaven ve stoje. Pes zůstává v této pozici vedle kužele, zatímco psovod přechází k další kartě.',
      'Další cvik v parkuru musí být vybrán z těchto karet: 3-302, 3-319 D0a-d a 2-215, 2-216.',
    ],
    subParts: [
      { text: 'základní pozice', main: true },
      { text: 'pes je do 1 metru od kužele', main: true },
      { text: 'pes zůstává v pozici', main: true },
    ],
    sequencing: {
      // p. 61: "Další cvik v parkuru musí být vybrán z těchto karet: …"
      nextOneOf: ['3-302', '3-319', '2-216', '2-215'],
      equipment: ['cones'],
    },
    image: '3-324',
    sourcePage: 61,
  },
  {
    code: '3-325',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Výměna při obratu o 180° vpravo',
    description: [
      'Tým se před kartou otočí o 180° doprava a poté pokračují v opačném směru. Pes změní pozici vedení.',
    ],
    subParts: [
      { text: 'psovod i pes se otočí o 180° doprava', main: true },
      { text: 'pes je veden u druhé nohy', main: true },
    ],
    sequencing: {
      // p. 61: the dog changes the heeling side.
      sideChange: true,
    },
    image: '3-325',
    sourcePage: 61,
  },
  {
    code: '3-326',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Výměna při obratu o 180° vlevo',
    description: [
      'Tým se před kartou otočí o 180° doleva a poté pokračují v opačném směru. Pes změní pozici vedení.',
    ],
    subParts: [
      { text: 'psovod i pes se otočí o 180° doleva', main: true },
      { text: 'pes je veden u druhé nohy', main: true },
    ],
    sequencing: {
      // p. 61: the dog changes the heeling side.
      sideChange: true,
    },
    image: '3-326',
    sourcePage: 61,
  },
  {
    code: '3-327',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Výměna strany před psovodem - za pohybu',
    description: [
      'V místě pro vykonání cviku pes před psovodem změní stranu a na druhé straně zaujme pozici u nohy. Pes pozici změní tak, že běží diagonálně před psovodem a zaujme novou pozici nohy na druhé straně. Nesmí běhat v kruhu, aby měnil strany.',
    ],
    subParts: [
      { text: 'psovod je stále v pohybu', main: true },
      { text: 'pes mění stranu diagonálně před psovodem', main: true },
    ],
    sequencing: {
      // p. 61: the dog changes the heeling side.
      sideChange: true,
    },
    image: '3-327',
    sourcePage: 61,
  },
]

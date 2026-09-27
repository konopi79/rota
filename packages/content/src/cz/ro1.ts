import type { Card } from '../schema'

/**
 * Proofread from Zkušební řád Rally Obedience v ČR 2026, příloha 1 (`sourcePage` = page
 * of the regulation). Sequencing rules cite the regulation; see plan §5.
 */
export const RO1_CARDS: Card[] = [
  {
    code: '1-101',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: '360° vlevo',
    description: [
      'Tým provede v místě pro vykonání cviku obrat vlevo o 360°, přičemž psovod provádí obrat na místě. Lehké posuny nohou ve směru obratu jsou povoleny. Pes během provádění cviku zůstává stále u nohy. Z pohledu psovoda se nemění směr postupu.',
    ],
    subParts: [
      { text: '360° obrat vlevo', main: true },
      { text: 'pes zůstává u nohy psovoda', main: true },
    ],
    sequencing: {},
    image: '1-101',
    sourcePage: 30,
  },
  {
    code: '1-102',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Za pohybu – úkrok vpravo',
    description: [
      'Za stálého pohybu udělá psovod před kartou úkrok stranou doprava, pes se pohybuje současně a rovnoběžně s ním. Následně bez zastavení tým míjí kartu po své levé straně. Cvik platí jako změna směru a musí být proveden před kartou.',
    ],
    subParts: [
      { text: 'úkrok vpravo', main: false },
      { text: 'pes se pohybuje současně se psovodem', main: false },
      { text: 'psovod zůstává v pohybu', main: false },
    ],
    sequencing: {},
    image: '1-102',
    sourcePage: 30,
  },
  {
    code: '1-103',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stop – obrat vpravo o 90° – vpřed',
    description: [
      'Tým zastaví před kartou a zaujme základní pozici. Tým provede na místě obrat vpravo o 90° a pokračuje v chůzi.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'úhel', main: false },
      { text: 'vpravo', main: true },
      { text: 'dodržení pozice psa u nohy psovoda', main: false },
    ],
    sequencing: {},
    image: '1-103',
    sourcePage: 30,
  },
  {
    code: '1-104',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stop – obrat vlevo o 90° – vpřed',
    description: [
      'Tým zastaví před kartou a zaujme základní pozici. Tým provede na místě obrat vlevo o 90° a pokračuje v chůzi.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'úhel', main: false },
      { text: 'vlevo', main: true },
      { text: 'dodržení pozice psa u nohy psovoda', main: false },
    ],
    sequencing: {},
    image: '1-104',
    sourcePage: 31,
  },
  {
    code: '1-105',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – obrat vpravo o 90° – stop',
    description: [
      'Tým zastaví před kartou a zaujme základní pozici. Tým provede na místě obrat vpravo o 90°. Na konci cviku tým zůstává v základní pozici.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'úhel', main: false },
      { text: 'vpravo', main: true },
      { text: 'základní pozice', main: false },
      { text: 'dodržení psa pozice u nohy', main: false },
    ],
    sequencing: {},
    image: '1-105',
    sourcePage: 31,
  },
  {
    code: '1-106',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – obrat vlevo o 90° – stop',
    description: [
      'Tým zastaví před kartou a zaujme základní pozici. Tým provede na místě obrat vlevo o 90°. Na konci cviku tým zůstává v základní pozici.',
    ],
    subParts: [
      { text: 'základní pozice', main: false },
      { text: 'úhel', main: false },
      { text: 'vlevo', main: true },
      { text: 'základní pozice', main: false },
      { text: 'dodržení psa pozice u nohy', main: false },
    ],
    sequencing: {},
    image: '1-106',
    sourcePage: 31,
  },
  {
    code: '1-107',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop - 1 krok vpřed + stůj - 2 kroky vpřed + sedni - 3 kroky vpřed + lehni',
    description: [
      'Tým zastaví u karty v místě pro vykonání cviku a zaujme základní pozici. Tým provede společně posun o jeden krok vpřed, zastaví se a pes zůstává stát. Dále tým provede dva kroky vpřed, zastaví se a zaujme základní pozici. Následně tým provede tři kroky vpřed, zastaví se a pes si lehá. Při všech posunech vpřed pes vždy následuje psovoda.',
    ],
    subParts: [
      { text: 'sedni, stůj, sedni, lehni', main: false },
      { text: '1, 2, 3, kroky (pohyb nohou)', main: false },
    ],
    sequencing: {},
    image: '1-107',
    sourcePage: 32,
  },
  {
    code: '1-108',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Předsednutí - 1 krok vzad + stůj před psovodem - 2 kroky vzad + sedni před psovodem - 3 kroky vzad + lehni před psovodem',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'V místě pro provedení cviku dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat až čtyři kroky vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Poté co pes zaujme pozici před psovodem, provede psovod jeden krok vzad, pes jej následuje a zaujímá pozici stůj před psovodem. Následně psovod provede dva kroky vzad, pes jej následuje a zaujímá pozici sedni před psovodem. Dále psovod provede tři kroky vzad, pes jej následuje a zaujímá pozici lehni před psovodem.',
      'Během zaujímání pozic před psovodem a provádění cviku z doplňkové karty nesmí psovod pohybovat nohama.',
    ],
    subParts: [
      { text: 'sedni, stůj, sedni, lehni', main: false },
      { text: 'následování pohybu vzad', main: false },
      { text: '1, 2, 3 kroky vzad', main: false },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 32: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
    },
    image: '1-108',
    sourcePage: 32,
  },
  {
    code: '1-109',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Zastavit – lehni',
    description: [
      'Tým se zastaví v místě pro vykonání cviku, přičemž si pes rovnou na povel lehá u nohy psovoda (nesmí si nejprve sednout ani zůstat stát).',
    ],
    subParts: [
      { text: 'Zastavení', main: true },
      { text: 'lehni (z plynulého pohybu) bez předchozího sedni', main: true },
      { text: 'na konci psovod stojí vedle psa', main: false },
    ],
    sequencing: {},
    image: '1-109',
    sourcePage: 33,
  },
  {
    code: '1-110',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stop – rychlé tempo ze sedu',
    description: [
      'Tým zastaví v místě pro vykonání cviku a zaujme základní pozici. Na povel psovoda tým okamžitě vyráží společně v rychlém tempu vpřed. Tým udržuje rychlé tempo, dokud jiný cvik toto tempo nezmění (statický cvik, změna tempa, cíl - tento cvik může být i na konci parkuru). Změna tempa musí být u psovoda i psa zřetelná.',
    ],
    subParts: [
      { text: 'základní pozice', main: true },
      { text: 'okamžité rychlé tempo', main: true },
      { text: 'udržení tempa co celý cvik', main: true },
    ],
    sequencing: {
      // p. 33: pace change — holds until a static exercise, another pace or the finish.
      pace: 'fast',
      // p. 62: RO-V — "pouze jako poslední karta".
      lastOnly: ['RO-V'],
    },
    image: '1-110',
    sourcePage: 33,
  },
  {
    code: '1-111',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Slalom jednoduchý s rušivým vlivem',
    description: [
      'Dva kužely a dvě misky jsou rozestavěny v řadě za sebou s rozestupem 1,5 m od sebe tak, že misky jsou v řadě umístěny mezi kužely. V jedné misce se nachází aromatické pamlsky, ve druhé dobře viditelné hračky, obě misky musí být zakryté. Karta je umístěna před prvním kuželem, viditelná ze směru příchodu týmu, který vstupuje do slalomu vždy zprava (tj. první kužel po své levé straně psa). Směr postupu ze slalomu závisí na poloze další karty. V případě pozření pamlsků, převrácení misky nebo krytu, již není možné cvik opakovat a je tudíž nesplněn (-10 bodů).',
    ],
    subParts: [
      { text: 'vstup správnou stranou do slalomu', main: false },
      { text: 'slalom', main: true },
      { text: 'míjení misky, aniž by byla převržena nebo pes chňapal po poklopu', main: true },
      {
        text: 'Nebude-li hlavní cvik předveden, hodnocení je -10 bodů, bez možnosti opakování!',
        main: false,
      },
    ],
    sequencing: {
      equipment: ['cones', 'bowls'],
    },
    image: '1-111',
    sourcePage: 33,
  },
  {
    code: '1-112',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: '180° obrat vpravo',
    description: [
      'Před kartou provede tým na místě obrat o 180° vpravo (max. 4 kroky nohou). Pes zůstává v pozici u nohy.',
    ],
    subParts: [
      { text: 'obrat vpravo', main: true },
      { text: 'pes v pozici u nohy', main: true },
    ],
    sequencing: {},
    image: '1-112',
    sourcePage: 34,
  },
  {
    code: '1-113',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: '180° obrat vlevo',
    description: [
      'Před kartou provede tým na místě obrat o 180 ° vlevo (max. 4 pohyby nohou). Pes zůstává v pozici u nohy.',
    ],
    subParts: [
      { text: 'obrat vlevo', main: true },
      { text: 'pes v pozici u nohy', main: true },
    ],
    sequencing: {},
    image: '1-113',
    sourcePage: 34,
  },
  {
    code: '1-114',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Předsednutí – úkrok stranou – vpravo',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'Před kartou dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat až čtyři kroky vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Jakmile pes zaujme pozici před psovodem, psovod udělá znatelný úkrok doprava (ne diagonálně), přičemž pes jej následuje končí opět v předsednutí před psovodem. Po splnění cviku na doplňkové kartě tým míjí kartu po své levé straně.',
    ],
    subParts: [
      { text: '2x předsednutí', main: true },
      { text: 'úkrok vpravo', main: true },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 34: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
    },
    image: '1-114',
    sourcePage: 34,
  },
  {
    code: '1-115',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'AB',
    name: 'Předsednutí – úkrok stranou – vlevo',
    description: [
      'K tomuto cviku je třeba přidat doplňkovou kartu D0a–d.',
      'Před kartou dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat až čtyři kroky vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Jakmile pes zaujme pozici před psovodem, psovod udělá znatelný úkrok doleva (ne diagonálně), přičemž pes jej následuje končí opět v předsednutí před psovodem. Po splnění cviku na doplňkové kartě tým míjí kartu po své pravé straně.',
    ],
    subParts: [
      { text: '2x předsednutí', main: true },
      { text: 'úkrok vlevo', main: true },
      { text: 'ukončení D0a–d', main: false },
    ],
    sequencing: {
      // p. 35: "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d."
      requiresSupplementary: true,
    },
    image: '1-115',
    sourcePage: 35,
  },
  {
    code: '1-116',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: '2 x čelem vzad – pes za psovodem',
    description: [
      'Psovod provede obrat do té strany, na které se nachází pes, zatímco pes provádí obrat na tu stranu, kde se nachází psovod. Pes obchází psovoda zezadu a vrací se na výchozí stranu vedení. Jakmile se pes ocitne u nohy psovoda, psovod provede znovu obrat do té strany, na které se nachází pes, zatímco pes znovu provádí obrat na tu stranu, kde se nachází psovod. Pes opět obchází psovoda zezadu a vrací se na výchozí stranu u nohy psovoda. Obraty se provádí na místě a bez mezikroku. Tým pokračuje dál bez zastavení.',
    ],
    subParts: [
      { text: '2x čelem vzad', main: true },
      { text: 'práce týmu bez mezikroku', main: false },
    ],
    sequencing: {},
    image: '1-116',
    sourcePage: 35,
  },
  {
    code: '1-117',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Figura 8 s rušivým vlivem',
    description: [
      'Čtyři misky, naplněné pamlsky a hračkami, přikryté poklopem jsou rozestavěny na vrcholech imaginárního kosočtverce tak, že pomyslná delší spojnice dvou protilehlých misek je 3 m a kratší pomyslná spojnice druhých dvou protilehlých misek je 1,5 m od sebe. Vstup do figury určuje karta, kterou tým vždy míjí po své levé straně (karta vždy vlevo od psa). Při provádění figury tým musí celkem 3x protnout pomyslný střed obrazce, přičemž vždy postupně obchází misky ležící na delší pomyslné spojnici. Východ z figury se vždy nachází na protilehlé straně proti vstupu.',
      'V případě pozření pamlsků, převrácení misky nebo krytu, již není možné cvik opakovat a je tudíž nesplněn (-10 bodů).',
    ],
    subParts: [
      { text: 'správné uvedení do cviku', main: false },
      { text: 'průchod 3x středem', main: false },
      { text: 'míjení misky, aniž by byla převržena nebo pes chňapal po poklopu', main: true },
      {
        text: 'Nebude-li hlavní cvik předveden, hodnocení je -10 bodů, bez možnosti opakování!',
        main: false,
      },
    ],
    sequencing: {
      equipment: ['bowls'],
    },
    image: '1-117',
    sourcePage: 35,
  },
  {
    code: '1-118',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Zastavení ve stoje',
    description: [
      'Tým se zastaví v místě pro provedení cviku a pes zaujme polohu ve stoje, aniž by si před tím sedl.',
    ],
    subParts: [
      { text: 'zastavení', main: true },
      { text: 'stání bez usedání', main: true },
    ],
    sequencing: {},
    image: '1-118',
    sourcePage: 36,
  },
  {
    code: '1-119',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stůj – obrat vpravo o 90° – vpřed',
    description: [
      'Tým zastaví před kartou, pes zůstává stát vedle psovoda. Tým provede na místě obrat o 90° vpravo a pokračuje v chůzi.',
    ],
    subParts: [
      { text: 'Psovod zůstane stát, pes stojí v pozici u nohy', main: false },
      { text: 'Obrat', main: false },
      { text: 'Vpravo', main: true },
      { text: 'Pes zůstane v pozici u nohy', main: false },
    ],
    sequencing: {},
    image: '1-119',
    sourcePage: 36,
  },
  {
    code: '1-120',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Stůj – obrat vlevo o 90° – vpřed',
    description: [
      'Tým zastaví před kartou, pes zůstává stát vedle psovoda. Tým provede na místě obrat o 90° vlevo a pokračuje v chůzi.',
    ],
    subParts: [
      { text: 'Psovod zůstane stát, pes stojí v pozici u nohy', main: false },
      { text: 'Obrat', main: false },
      { text: 'Vlevo', main: true },
      { text: 'Pes zůstane v pozici u nohy', main: false },
    ],
    sequencing: {},
    image: '1-120',
    sourcePage: 37,
  },
  {
    code: '1-121',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: '180° obrat vpravo - 180° obrat vlevo',
    description: [
      'Tým provede v místě pro vykonání cviku na místě obrat o 180° vpravo (max. 4 kroky nohou), poté následují 2 kroky vpřed a opět obrat na místě tentokrát o 180° vlevo. Pes po celou dobu zůstává v pozici u nohy.',
    ],
    subParts: [
      { text: 'obrat vpravo, obrat vlevo', main: true },
      { text: '2 kroky', main: false },
      { text: 'Pes zůstane v pozici u nohy', main: false },
    ],
    sequencing: {},
    image: '1-121',
    sourcePage: 37,
  },
  {
    code: '1-122',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: '180° obrat vlevo - 180° obrat vpravo',
    description: [
      'Tým provede v místě pro vykonání cviku na místě obrat o 180° vlevo (max. 4 kroky nohou), poté následují 2 kroky vpřed a opět obrat na místě tentokrát o 180° vpravo. Pes po celou dobu zůstává v pozici u nohy.',
    ],
    subParts: [
      { text: 'obrat vlevo, obrat vpravo', main: true },
      { text: '2 kroky', main: false },
      { text: 'Pes zůstane v pozici u nohy', main: false },
    ],
    sequencing: {},
    image: '1-122',
    sourcePage: 37,
  },
  {
    code: '1-123',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'B',
    name: 'Výměna strany za psovodem v pohybu',
    description: [
      'Pes v místě pro vykonání cviku provede za psovodem výměnu strany. Psovod se stále pohybuje dopředu. Pes nesmí při výměně udělat velký oblouk.',
    ],
    subParts: [
      { text: 'Pes změní stranu', main: true },
      { text: 'Pes neudělá velký oblouk', main: false },
      { text: 'Psovod je stále v pohybu', main: false },
    ],
    sequencing: {
      // p. 38: the dog changes the heeling side.
      sideChange: true,
    },
    image: '1-123',
    sourcePage: 38,
  },
  {
    code: '1-124',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop – změna za psovodem – stop',
    description: [
      'Tým zastaví v místě pro vykonání cviku a zaujme základní pozici. Na povel psovoda pes za zády psovoda změní stranu a následně se posadí vedle druhé nohy psovoda.',
    ],
    subParts: [
      { text: 'Pes změní stranu', main: true },
      { text: 'Výměna strany za psovodem', main: false },
      { text: '2x sed', main: false },
    ],
    sequencing: {
      // p. 38: the dog changes the heeling side.
      sideChange: true,
    },
    image: '1-124',
    sourcePage: 38,
  },
  {
    code: '1-125',
    ruleset: 'CZ',
    kind: 'exercise',
    exerciseType: 'A',
    name: 'Stop - změna před psovodem - stop',
    description: [
      'Tým zastaví v místě pro vykonání cviku a zaujme základní pozici. Na povel psovoda jej pes zepředu obejde a přiřadí se k druhé noze psovoda, kde usedá. Strana vedení je změněna.',
    ],
    subParts: [
      { text: 'Pes změní stranu', main: true },
      { text: 'Výměna strany před psovodem', main: false },
      { text: '2x sed', main: false },
    ],
    sequencing: {
      // p. 38: the dog changes the heeling side.
      sideChange: true,
    },
    image: '1-125',
    sourcePage: 38,
  },
]

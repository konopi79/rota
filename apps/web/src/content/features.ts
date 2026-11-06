/**
 * What ROTA can do — shown on `/o-aplikaci`, the link to send when someone asks. A feature list,
 * not a changelog (the author, 2026-11-03): related things go into one item, its details as
 * points. Kept in Czech like the rest of the user-facing content (same pattern as Malibo's
 * `/funkce`).
 *
 * MAINTENANCE: when you ship a feature, put it into the item it belongs to (a new point), or a
 * new item if it is something of its own, and point `LATEST_FEATURE_ID` at that item — that
 * single id gets the "Nové" badge. Descriptions one or two sentences, points short; tykání,
 * genderless.
 */

export interface Feature {
  id: string
  title: string
  desc: string
  /** The details, as a list under the description. */
  points?: string[]
}

export interface FeatureGroup {
  title: string
  items: Feature[]
}

/** The most recently shipped feature — badged "Nové" on the page. */
export const LATEST_FEATURE_ID = 'regulation-2027'

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'Třídy a karty',
    items: [
      {
        id: 'classes',
        title: 'Všechny třídy',
        desc: 'RO-Z, RO1, RO2, RO3 a RO-V podle národního zkušebního řádu 2026 nebo připravovaného 2027 a FCI-ROB podle mezinárodního řádu FCI. Vyšší národní třídy obsahují i karty nižších tříd.',
      },
      {
        id: 'regulation-2027',
        title: 'Řád 2027',
        desc: 'Na úvodní stránce přepneš mezi národním řádem 2026 a připravovaným řádem 2027, který od dubna 2027 přebírá německý řád VDH 2027. Volba se zapamatuje; dokud ji nezměníš, platí řád 2026, od dubna 2027 řád 2027.',
        points: [
          'Třídy RO-Z až RO3 a RO-V s kartami a pravidly řádu 2027: nové karty, změněné cviky, doplňková karta D0e, změny strany vedení podle řádu a každá karta na parkuru nejvýš dvakrát.',
          'Animace všech cviků řádu 2027 se psem vlevo i vpravo a procházení parkuru v animaci.',
          'Nové karty mají vlastní grafiku ROTA, než vyjdou oficiální české karty; popisy nových a změněných cviků jsou náš překlad německého textu.',
        ],
      },
      {
        id: 'official-cards',
        title: 'Oficiální karty',
        desc: 'Grafika karet přímo z řádů – 124 národních a 91 FCI, s popisem každého cviku.',
      },
      {
        id: 'catalogue',
        title: 'Katalog karet',
        desc: 'Všechny karty třídy na jednom místě, s detailem každé karty.',
        points: [
          'Hledání podle čísla nebo názvu (i bez diakritiky), filtry na nové karty třídy, typ cviku, body FCI nebo cviky bez pomůcek.',
          'U karty popis, dílčí části, nákres spirál a pravidla řazení.',
          'U národních karet je vidět, která část cviku je hlavní a která vedlejší – chybí-li hlavní, vyplatí se cvik zopakovat.',
          'Tlačítky Předchozí a Další projdeš vyfiltrovaný seznam bez vracení na přehled.',
        ],
      },
      {
        id: 'animations',
        title: 'Animace cviků',
        desc: 'U každé karty si v detailu pustíš 3D animaci, jak psovod a pes cvik provedou – s popisky, zpomalením, otáčením pohledu a vyznačeným místem pro provedení cviku.',
        points: [
          'Všechny karty národních tříd (RO-Z až RO3, RO-V), doplňkové karty D0 i karty FCI-ROB – ty podle pravidel FCI a jejich oficiálního videa.',
          'Skoky přes laťku, odběhnutí, vyslání ke kuželu i odložení s přivoláním; u odložení si vybereš, co následuje.',
          'Karty i se psem u pravé nohy, jako po startu „R“ – národní i FCI (kromě 417 a 418, které se cvičí jen z jedné strany).',
          'V katalogu takové karty poznáš podle štítku „animace“.',
        ],
      },
    ],
  },
  {
    title: 'Trénink s náhodnými kartami',
    items: [
      {
        id: 'random-deck',
        title: 'Náhodný balíček',
        desc: 'Karty jedna po druhé na celou obrazovku; další kartu ukáže přejetí, klepnutí nebo tlačítko.',
        points: [
          'Štítky nahoře ukazují, jestli jdeš v pomalém či rychlém tempu a u které nohy je pes.',
          'Pořadí karet je uložené v adrese – po obnovení stránky i u toho, komu odkaz pošleš, je stejné.',
          'Během tréninku zůstane obrazovka rozsvícená.',
        ],
      },
      {
        id: 'performable',
        title: 'Pořadí, které jde se psem opravdu provést',
        desc: 'Doplňková karta D0 je vždy u svého cviku, po odložení psa přijde přivolání, tempo a strana psa se řídí řádem. U FCI jen plynulé cviky v pomalém či rychlém tempu, správná strana u 417/418 a nejvýš dvakrát stejná karta.',
      },
      {
        id: 'options',
        title: 'Nastavení podle tréninku',
        desc: 'Celá třída, nebo jen nové karty; počet karet; pomůcky, které máš s sebou (kužely, misky, překážka); strana psa na startu; popis pod kartou. Poslední nastavení si aplikace pamatuje.',
      },
      {
        id: 'voice',
        title: 'Čtení nahlas',
        desc: 'Aplikace ti řekne číslo a název další karty (i doplňkové) a upozorní na změnu tempa nebo strany – telefon může zůstat v kapse. Čte i v animaci parkuru.',
      },
    ],
  },
  {
    title: 'Parkur',
    items: [
      {
        id: 'course',
        title: 'Tréninkový parkur',
        desc: 'Parkur o velikosti jako na závodech, s číslovaným seznamem k vytištění, sdílení nebo projití jako balíček.',
        points: [
          'Národní třídy podle směrnic pro rozhodčí: povinné cviky třídy, opakují se jen karty, které se opakovat smí, a pes jde vpravo jen tak, jak to směrnice dovolují.',
          'FCI-ROB s nejméně sedmi čtyřbodovými a pěti tříbodovými kartami, karty tak často, jak je dávají rozhodčí na skutečných parkurech (přes 140 parkurů z katalogu FCI Rally Obedience HUB) – a přece každý parkur jiný.',
          'Tlačítkem „Na jednu obrazovku“ zobrazíš všechny karty najednou, co největší – telefon postavíš opodál a displej nezhasne.',
        ],
      },
      {
        id: 'field-plan',
        title: 'Plánek na ploše',
        desc: 'Karty tréninkového parkuru i balíčku do délky parkuru rozmístí aplikace na plochu – start na kraji, mezi kartami rovně, směr mění jen karty, místo pro kužely, přivolání i skoky.',
        points: [
          'FCI-ROB na 20 × 20 m nebo 20 × 30 m, 3–5 m mezi kartami.',
          'Národní třídy na 20 × 30 m, jak doporučuje řád (RO-Z, RO1 a RO-V i na 20 × 20 m), s odstupy podle směrnic a volnou uličkou mezi kartami.',
          'V balíčku ho otevřeš ikonou mapy, aktuální karta je vyznačená.',
          'Klepnutím ho zvětšíš přes celou obrazovku a přiblížíš dvěma prsty; vytištěný parkur má plánek přes celou první stranu.',
        ],
      },
      {
        id: 'course-walkthrough',
        title: 'Parkur v animaci',
        desc: 'Tréninkový parkur si projdeš celý v 3D animaci – národní třídy i FCI-ROB: tým jde po plánku od startu ke každé kartě, provede cvik a pokračuje do cíle.',
        points: [
          'Pes zůstane odložený u své karty a psovod ho od další přivolá nebo se k němu vrátí; překážky a kužely stojí podle plánku.',
          'U FCI i přivolání u kuželu, vyslání ke kuželu a skoky; plánek FCI odpovídá tomu, jak cviky provádí animace.',
          'I se psem vpravo po startu „R“ nebo uprostřed parkuru.',
          'Kamera za týmem (natočíš si ji) nebo nad celou plochou, pauza, rychlost a přeskakování po kartách.',
          'Se čtením nahlas ohlásí každou kartu, když k ní tým po předchozím cviku vyráží.',
        ],
      },
      {
        id: 'cndc',
        title: 'Více karet na jednom stanovišti (CNDC)',
        desc: 'V RO1 až RO3 a RO-V dá balíček i tréninkový parkur na přání několik karet na jedno stanoviště, jako na skutečných parkurech – cviky z nich uděláš za sebou.',
        points: [
          'Raději přísněji: jen kombinace, které pravidla jistě dovolují.',
          'Na plánku stojí karty stanoviště vedle sebe; za CNDC s dynamickým cvikem je další stanoviště o metr dál, jak chtějí směrnice.',
          'V animaci tým na stanovišti navazuje dalším cvikem hned, po dynamickém cviku krokem vpřed.',
          'Ve vlastním parkuru dáš kartu na stejné stanoviště jako předchozí.',
        ],
      },
      {
        id: 'custom-course',
        title: 'Vlastní parkur',
        desc: 'Poskládej celý parkur nebo jen krátkou sekvenci cviků – třeba podle plánku z tréninku – a pošli ji odkazem; příjemce ji projde jako balíček.',
        points: [
          'Pořadí aplikace kontroluje ve čtyřech stupních: vypnutá kontrola, řád, směrnice pro rozhodčí, nebo přísně – navíc opatrná pravidla, podle kterých skládá CNDC aplikace.',
        ],
      },
      {
        id: 'quiz',
        title: 'Kvíz',
        desc: 'Buď si vybavíš, co se u karty dělá, nebo vybíráš správný popis ze tří. Karty, které ti nejdou, chodí častěji; vidíš, kolik karet už umíš.',
      },
    ],
  },
  {
    title: 'Aplikace',
    items: [
      {
        id: 'offline',
        title: 'Funguje bez signálu',
        desc: 'Po prvním otevření jde všechno i offline, včetně obrázků všech karet.',
      },
      {
        id: 'install',
        title: 'Na plochu telefonu',
        desc: 'Přidáš si ji na plochu jako běžnou aplikaci – na iPhonu přes Sdílet → „Přidat na plochu“, na Androidu tlačítkem.',
      },
      {
        id: 'privacy',
        title: 'Bez registrace a cookies',
        desc: 'Nastavení a výsledky kvízu zůstávají jen v tvém telefonu. Návštěvy a chyby aplikace počítá jen anonymní počítadlo bez cookies.',
      },
      {
        id: 'feedback',
        title: 'Nahlášení chyby nebo nápadu',
        desc: 'Odkazem na hlavní stránce, u tříd a karet nebo na konci balíčku otevřeš krátký formulář bez přihlašování. Stránku, verzi a zařízení do něj aplikace doplní sama, včetně naposledy otevřeného balíčku, takže napíšeš jen, co nesedí nebo co by se ti hodilo.',
      },
      {
        id: 'free',
        title: 'Zdarma a s otevřeným kódem',
        desc: 'Bez reklam a poplatků, zdrojový kód pod licencí MIT.',
      },
    ],
  },
]

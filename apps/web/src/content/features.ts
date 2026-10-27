/**
 * What ROTA can do — shown on `/o-aplikaci`, the link to send when someone asks. Plain
 * points grouped by theme, kept in Czech like the rest of the user-facing content (same
 * pattern as Malibo's `/funkce`).
 *
 * MAINTENANCE: when you ship a feature, add its item to the right group and point
 * `LATEST_FEATURE_ID` at it — that single id gets the "Nové" badge. Keep descriptions to
 * one or two sentences, tykání, genderless.
 */

export interface Feature {
  id: string
  title: string
  desc: string
}

export interface FeatureGroup {
  title: string
  items: Feature[]
}

/** The most recently shipped feature — badged "Nové" on the page. */
export const LATEST_FEATURE_ID = 'national-field-plan'

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'Třídy a karty',
    items: [
      {
        id: 'classes',
        title: 'Všechny třídy',
        desc: 'RO-Z, RO1, RO2, RO3 a RO-V podle národního zkušebního řádu 2026 a FCI-ROB podle mezinárodního řádu FCI. Vyšší národní třídy obsahují i karty nižších tříd.',
      },
      {
        id: 'official-cards',
        title: 'Oficiální karty',
        desc: 'Grafika karet přímo z řádů – 124 národních a 91 FCI, s popisem každého cviku.',
      },
      {
        id: 'catalogue',
        title: 'Katalog karet',
        desc: 'Hledání podle čísla nebo názvu (i bez diakritiky), filtry na nové karty třídy, typ cviku, body FCI nebo cviky bez pomůcek. U každé karty popis, dílčí části, nákres spirál a pravidla řazení; tlačítky Předchozí a Další projdeš vyfiltrovaný seznam bez vracení na přehled.',
      },
      {
        id: 'main-parts',
        title: 'Hlavní a vedlejší části cviku',
        desc: 'U národních karet vidíš, která část cviku je hlavní a která vedlejší – v detailu karty i v popisu pod kartou v balíčku. Chybí-li hlavní část, vyplatí se cvik zopakovat; u vedlejší opakováním nic nezískáš.',
      },
      {
        id: 'animations',
        title: 'Animace cviků',
        desc: 'U všech karet RO-Z a RO1, doplňkových karet D0 a 33 karet RO2 a RO3 si v detailu karty pustíš 3D animaci, jak psovod a pes cvik podle zkušebního řádu provedou – s popisky, zpomalením, otáčením pohledu a vyznačeným místem pro provedení cviku. V katalogu takové karty poznáš podle štítku „animace“.',
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
        id: 'field-plan',
        title: 'Parkur, který se vejde na plochu (FCI)',
        desc: 'Karty FCI-ROB rozmístí aplikace na plochu 20 × 20 m, nebo 20 × 30 m, když ji vybereš v nastavení: start na kraji, 3–5 m mezi kartami, mezi kartami rovně (směr mění jen karty), místo pro kužely, přivolání i skoky. Plánek s vyznačenou aktuální kartou otevřeš ikonou mapy; má ho balíček do 20 karet.',
      },
      {
        id: 'national-field-plan',
        title: 'Plánek i pro národní třídy',
        desc: 'Karty RO-Z až RO3 a RO-V rozmístí aplikace na plochu 20 × 30 m, jak ji doporučuje řád (RO-Z, RO1 a RO-V i na 20 × 20 m): každý cvik na vlastním stanovišti, mezi kartami rovně a nejméně 3 m, u skoků, odložení s přivoláním a některých cviků dál podle směrnic pro rozhodčí, ulička mezi kartami volná. Plánek má tréninkový parkur i balíček do délky parkuru.',
      },
      {
        id: 'plan-zoom-print',
        title: 'Plánek zvětšený i vytištěný',
        desc: 'Klepnutím na plánek tréninkového parkuru ho otevřeš přes celou obrazovku a přiblížíš tlačítky nebo dvěma prsty. Vytištěný parkur má plánek přes celou první stranu a seznam cviků na další.',
      },
      {
        id: 'badges',
        title: 'Tempo a strana psa na očích',
        desc: 'Štítky nahoře ukazují, jestli jdeš v pomalém či rychlém tempu a u které nohy je pes.',
      },
      {
        id: 'voice',
        title: 'Čtení nahlas',
        desc: 'Aplikace ti řekne číslo a název další karty (i doplňkové) a upozorní na změnu tempa nebo strany – telefon může zůstat v kapse.',
      },
      {
        id: 'share-deck',
        title: 'Balíček v odkazu',
        desc: 'Pořadí karet je uložené v adrese – po obnovení stránky i u toho, komu odkaz pošleš, je stejné.',
      },
      {
        id: 'wake-lock',
        title: 'Displej nezhasne',
        desc: 'Během tréninku zůstane obrazovka rozsvícená.',
      },
    ],
  },
  {
    title: 'Parkur a učení',
    items: [
      {
        id: 'course',
        title: 'Tréninkový parkur',
        desc: 'Parkur o velikosti jako na závodech – u FCI s nejméně sedmi čtyřbodovými a pěti tříbodovými kartami – s plánkem rozmístění na ploše. Číslovaný seznam k vytištění, sdílení nebo projití jako balíček.',
      },
      {
        id: 'fci-judges-course',
        title: 'FCI parkur jako od rozhodčích',
        desc: 'Tréninkový parkur FCI-ROB skládá karty tak často, jak je dávají rozhodčí na skutečných parkurech (přes 140 parkurů z katalogu FCI Rally Obedience HUB), ale každý parkur je jiný: víc odložení s přivoláním, slalomy, skoky a občas karta dvakrát.',
      },
      {
        id: 'course-grid',
        title: 'Celý parkur na jedné obrazovce',
        desc: 'Tlačítkem „Na jednu obrazovku“ zobrazíš všechny karty parkuru najednou, očíslované a co největší – telefon můžeš postavit opodál a nemusíš na něj sahat. Displej mezitím nezhasne.',
      },
      {
        id: 'national-course',
        title: 'Národní parkur podle směrnic pro rozhodčí',
        desc: 'Parkur RO-Z až RO3 a RO-V obsahuje povinné cviky své třídy, opakuje jen karty, které se opakovat smí (Stop, obraty, D0…), a psa vede vpravo jen tak, jak to směrnice dovolují – v RO1 od startu „R“ k první kartě nebo od poslední karty do cíle.',
      },
      {
        id: 'custom-course',
        title: 'Vlastní parkur',
        desc: 'Poskládej celý parkur nebo jen krátkou sekvenci cviků – třeba podle plánku z tréninku – a pošli ji odkazem; příjemce ji projde jako balíček. Pořadí aplikace kontroluje podle pravidel řazení (u národních tříd na přání i podle směrnic pro rozhodčí), kontrolu jde i vypnout.',
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

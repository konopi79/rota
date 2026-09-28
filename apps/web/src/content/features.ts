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
export const LATEST_FEATURE_ID = 'voice'

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
        desc: 'Hledání podle čísla nebo názvu (i bez diakritiky), filtry na nové karty třídy, typ cviku, body FCI nebo cviky bez pomůcek. U každé karty popis, dílčí části, nákres spirál a pravidla řazení.',
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
    title: 'Závody a učení',
    items: [
      {
        id: 'course',
        title: 'Závodní parkur',
        desc: 'Celý parkur podle pravidel třídy – u FCI i s nejméně sedmi čtyřbodovými a pěti tříbodovými kartami. Číslovaný seznam k vytištění, sdílení nebo projití jako balíček.',
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
        desc: 'Nastavení a výsledky kvízu zůstávají jen v tvém telefonu. Návštěvy počítá jen anonymní počítadlo bez cookies.',
      },
      {
        id: 'free',
        title: 'Zdarma a s otevřeným kódem',
        desc: 'Bez reklam a poplatků, zdrojový kód pod licencí MIT.',
      },
    ],
  },
]

/**
 * How to save ROTA to the phone and use it — the short guide on `/o-aplikaci#navod`, the
 * link to send when someone asks "how do I get it on my phone". Czech, tykání, genderless,
 * like `features.ts`.
 *
 * MAINTENANCE: keep the steps in line with the app (install hint, deck controls, voice) —
 * when one of those changes, change the step here too.
 */

export interface GuideSection {
  id: string
  title: string
  steps: string[]
}

export const APP_URL = 'rota.rock8cloud.app'

export const GUIDE: GuideSection[] = [
  {
    id: 'iphone',
    title: 'iPhone',
    steps: [
      `Otevři ${APP_URL} v Safari, Chromu nebo jiném prohlížeči.`,
      'Klepni na tlačítko Sdílet (čtvereček se šipkou nahoru – v Safari dole, v Chromu v adresním řádku) a vyber „Přidat na plochu“. Když položku nevidíš, posuň nabídku níž.',
      'Spouštěj ROTA ikonou z plochy. Aplikace na ploše má vlastní paměť – nastavení z prohlížeče se do ní nepřenese.',
    ],
  },
  {
    id: 'android',
    title: 'Android',
    steps: [
      `Otevři ${APP_URL} v Chromu (nebo v Samsung Internetu).`,
      'Na úvodní stránce klepni na „Nainstalovat“. Když tlačítko nevidíš, vyber v menu ⋮ „Instalovat aplikaci“ nebo „Přidat na plochu“.',
      'Ve Firefoxu přidáš ROTA přes menu → „Přidat na plochu“.',
    ],
  },
  {
    id: 'before-training',
    title: 'Před prvním tréninkem',
    steps: [
      'Otevři aplikaci jednou na Wi-Fi a chvíli ji nech otevřenou – stáhne si obrázky všech karet (asi 18 MB). Pak funguje i na cvičišti bez signálu.',
      'Vyber třídu, nastav balíček a začni. Další kartu ukáže přejetí prstem, klepnutí na kartu nebo tlačítko „Další“; klepnutí na levou třetinu karty vrátí předchozí.',
      'Displej během balíčku nezhasíná. Když přesto zhasne, nejspíš ho vypíná úspora baterie.',
      'Nové verze se načtou samy při dalším otevření.',
    ],
  },
  {
    id: 'voice',
    title: 'Čtení nahlas',
    steps: [
      'Zapni „Číst karty nahlas“ v nastavení balíčku, nebo ikonou reproduktoru nahoře v balíčku.',
      'Hlasitost řídí hlasitost médií (hudby a videa), ne vyzvánění.',
      'Android: když čte cizím přízvukem, chybí mu čeština. V Nastavení telefonu najdi „Převod textu na řeč“ (obvykle Systém → Jazyky a zadávání), u modulu Google nainstaluj hlasová data pro češtinu a stáhni je i offline.',
    ],
  },
]

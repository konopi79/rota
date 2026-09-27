# ROTA — Rally Obedience Training App — implementation plan

A free, open-source, installable web app (PWA) for rally obedience training. The handler
always picks **one class — RO-Z, RO1, RO2, RO3, RO-V or FCI-ROB** — and the app deals
that class's exercise cards in random order, full screen, one at a time — no printing,
no shuffling a paper deck on the training field. Anyone can use it; there are no
accounts. Anything the app remembers is stored locally in the browser.

**The way it is used** (and what drives the UX): glance at the card on the phone, put
the phone into a vest pocket, perform the exercise with the dog, take the phone out,
next card. So every dealt sequence must be **performable in that order with a real
dog** (§5), and every card must be readable in one glance.

**Which cards a class contains:**

- **RO-Z, RO1, RO2, RO3** are cumulative — each higher class contains the cards of all
  lower classes plus its own (RO2 = RO-Z + RO1 + RO2 cards).
- **RO-V** (veterans) has its own explicit list drawn from all national classes.
- **FCI-ROB** contains only its own cards and never mixes with the national ones.

Source material: `podklady/` (downloaded from the author's Google Drive, **not
committed** — ~120 MB of PDFs; the Drive folder stays the source of truth).

| #   | Phase                                         | Status                      |
| --- | --------------------------------------------- | --------------------------- |
| R0  | Scaffold (monorepo, tooling, CLAUDE.md)       | ✅ 2026-09-27               |
| R1  | Content pipeline + national ruleset (CZ 2026) | ✅ 2026-09-27               |
| R2  | FCI ruleset                                   | ✅ 2026-09-27               |
| R3  | Random cards mode (rule-aware dealing)        | ✅ 2026-09-27               |
| R4  | Card catalogue                                | ✅ 2026-09-27               |
| R5  | PWA: offline + install                        | ✅ 2026-09-27               |
| R6  | Deploy + open-source release                  | 🚧 live; repo still private |
| R7  | Competition-course generator                  | ✅ 2026-09-27               |
| R8  | Quiz                                          | ✅ 2026-09-27               |
| R9  | Voice: cards read aloud                       | ⏳                          |

> **Order:** R3 is built before R2 so the national classes are usable end to end first;
> FCI plugs into the same dealer afterwards.
>
> **Keeping this current:** tick the checklist items as they land and the phase to ✅
> with a date when it ships. A phase or item that turns out to be a bad idea gets ⏭️ plus
> the reason — the record of why we didn't is worth as much as the record of what we did.

## 1. Decisions

**D1 — Same stack as Malibo and Zkofno, minus the backend.** Bun workspaces monorepo,
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui v4 on
`@base-ui/react`, Zod 4, lucide icons, Prettier + ESLint + lefthook, `bun test`. **No**
database, tRPC, auth or e-mail — the content is static. The monorepo layout leaves room
to add `packages/db` + tRPC later exactly as in Malibo if something ever needs a server.

**D2 — No accounts; local storage only.** Last used settings, and later anything like
"cards I struggle with", live in `localStorage` behind one small typed module
(`lib/storage.ts`, Zod-validated, versioned key, falls back to defaults on bad data).
Nothing is sent anywhere. No analytics.

**D3 — Static output.** With no server features the app builds with `output: 'export'`
and is served as static files (small nginx/Caddy image, or any static host).

**D4 — Content is data in TypeScript, images are generated from the PDFs.** Card
definitions — including the sequencing metadata of §5 — live in `packages/content` as
typed, Zod-validated TS modules; card images are cut out of the official card PDFs by a
reproducible script (§4) and committed as webp. The PDFs themselves are not committed.

**D5 — Open source, non-commercial, official card graphics.** The code is published
under an open-source licence (MIT unless decided otherwise). The app shows the official
cards — the ones a handler sees at a competition — and its About page credits the
regulations and card sources and states it is an unofficial training aid. Laminated
decks of the same cards are sold commercially, so a free training app is not a concern.

**D6 — Czech UI, informal address (tykání)**, genderless phrasing where the reader is
unknown. Code, comments and docs in English. Strings in `apps/web/src/i18n/cs.json`
(i18next, as in Malibo) so a second language stays possible for FCI-ROB.

**D7 — Mobile first, glanceable.** Phone in one hand on a training field: huge card, big
tap targets, swipe, screen kept awake (Wake Lock API), portrait and landscape, readable
in sunlight (the cards are white — no dark card background).

**D8 — A dealt deck is always performable.** Dealing is a constrained random process,
not a plain shuffle: the rules of §5 are encoded as card metadata, the dealer only
produces sequences that satisfy them, and an **independent validator** checks every
sequence in tests.

## 2. Content model (`packages/content`)

```ts
type RulesetId = 'CZ' | 'FCI'
type ClassId = 'RO-Z' | 'RO1' | 'RO2' | 'RO3' | 'RO-V' | 'FCI-ROB'

type Ruleset = {
  id: RulesetId
  name: string // "Zkušební řád RO v ČR", "FCI Rally Obedience"
  validFrom: string // ISO date of the regulation version
  source: { title: string; url?: string }
}

type RoClass = {
  id: ClassId
  ruleset: RulesetId
  name: string
  course: {
    // composition rules — R3 defaults, R7 generator
    minCards: number
    maxCards: number
    leash: 'allowed' | 'off-leash'
    supplementary: string[] // allowed D0 cards: D0a–d, RO-V only D0a + D0c
    notes?: string[]
  }
  cardCodes: string[] // full, explicit list (cumulative lists expanded at build time
  // by a tested helper, never derived from code ranges at runtime)
  newCardCodes: string[] // the cards this class adds (for "only new cards")
}

type Card = {
  code: string // 'Z-001', '1-101', 'D0a', FCI '101'
  ruleset: RulesetId
  kind: 'exercise' | 'start' | 'finish' | 'supplementary'
  exerciseType?: 'A' | 'B' | 'AB' // A = static, B = dynamic, AB = decided by the D0 card
  points?: 1 | 2 | 3 | 4 // FCI only
  nameCs: string
  nameEn?: string // FCI only
  descriptionCs: string
  subParts?: { text: string; mainExercise: boolean }[] // national "Dílčí část / Hlavní cvik"
  sequencing: CardSequencing // §5
  image: { full: string; thumb: string }
}
```

### National ruleset — `2026nzr-ro-cz-final.pdf` (Zkušební řád RO v ČR, 2026)

- RO-Z = cards 001–032; RO1 = 001–125; RO2 = 001–232; RO3 = 001–327 (§5.4). Course
  sizes: RO-Z 15–18, RO1 18–20, RO2 20–22, RO3 22–24, plus start, finish and D0a–d.
  RO-Z/RO1 on or off leash, RO2/RO3 off leash. RO-Z contains no multi-part exercises
  (CNDC).
- **RO-V** (veterans, 8+ years, §5.4.5 + §8.1.2): 12 cards + start, finish, D0a, D0c,
  from an explicit list across all classes; Z-016 and 1-110 are "pouze jako poslední
  karta".
- Descriptions and sub-part tables: Příloha 1 (§8.1.1.1–8.1.1.5); types A / B / "A nebo
  B" (§8.1.1).
- Images: `RO-Z.pdf` (40 pages: start, finish, D0a–d, Z-001…Z-032 + execution diagrams of the spirals Z-018 and Z-019, shown in the card detail),
  `RO1.pdf` (25 = 1-101…1-125), `RO2.pdf` (32 = 2-201…2-232), `RO3.pdf` (27 = 3-301…3-327).
  One card per landscape A4 page, raster ~3500 × 2500 px, the code printed top right.

### FCI ruleset — `ouk-cz-fci_ro_regulations_and_guidelines_01-02-2025.pdf`

- Czech translation of the FCI international rules (valid from 1 Feb 2025); **one
  class**. Cards 1xx–4xx grouped by point value (1–4), Czech descriptions in §5, English
  names on the cards.
- Course (§3.5): 18–20 cards + start and finish; ≥ 7 four-point and ≥ 5 three-point
  cards; one card at most twice; the plan states the dog's starting side.
- Images: `RO-FCI.pdf` (96 pages, vector; includes an overview page and "N POINT(S)"
  divider pages to skip). The text layer carries the card number, so page → code mapping
  is read, not assumed.

### Out of scope

`cz-25-09-2024-obe-reg-cob-cz-2025-ok-opr_2.pdf` is the FCI **Obedience** (not rally
obedience) regulation — not used.

## 3. Class selection and options

A single choice of class — RO-Z, RO1, RO2, RO3, RO-V, FCI-ROB (the ruleset follows from
the class) — then:

- **which cards:** the whole class (default) or **only the cards new in this class**
  (RO1–RO3; for learning a new level);
- **how many:** all, or N (default = the class's max course size);
- **equipment I have with me:** cones / bowls / jump — cards needing missing equipment
  are left out (default: none checked, i.e. field practice with nothing but the dog);
- **starting side of the dog:** left (default) / right / random — a national start can be "na pravou ruku", FCI states it on every course plan;
- **show description under the card** — default off.

Last used options are remembered (D2).

## 4. Card image pipeline (`scripts/cards/`)

Reproducible, re-run whenever a PDF is updated:

1. Render/extract each page (`pdftoppm` / `pdfimages`, poppler) from `podklady/`.
2. Trim the white margin, normalise to the card's aspect ratio.
3. Map page → card code: national from the known page order, **checked** against the code
   printed on the card (OCR of the top-right corner or a manual review sheet); FCI from the
   PDF text layer.
4. Write `apps/web/public/cards/<ruleset>/<code>.webp` (full, ~1600 px wide) and
   `…/thumb/<code>.webp` (~400 px). Size budget ≤ 25 MB total — everything is cached
   offline (R5).
5. Emit a contact sheet (HTML) of all cards with their codes for a human review pass.

Descriptions and sequencing metadata are extracted from the regulations' text
(`pdftotext -layout`) by a helper script into draft TS, then **proofread by hand** —
PDF extraction mangles line breaks and tables, and a wrong rule is worse than none.

## 5. Performable sequences (D8)

A random shuffle can produce orders that cannot be performed as written. From the
regulations:

**National (CZ 2026)**

- **Supplementary cards.** 14 exercises end with the dog in front of the handler and
  "K tomuto cviku je třeba přidat doplňkovou kartu D0a–d" (e.g. Z-014 Předsednutí). They
  are always dealt **together with one D0 card**, shown on the same screen (as on a real
  course, where D0 sits right next to the main card). D0a/b end static (type A), D0c/d
  dynamic (type B); RO-V only D0a and D0c. D0 cards are never dealt on their own.
- **Pace.** Slow (Z-015) and fast (Z-016, and 1-110 "rychlé tempo ze sedu") pace hold
  "until another exercise changes it (static exercise, pace change, finish)". Normal pace
  (Z-017) only makes sense after slow or fast pace; the same pace twice in a row is
  meaningless.
- **Leave → follow-up.** Cards where the dog is left behind and the handler walks on
  (2-211, 2-212, 2-218, 3-301, 3-307, 3-310–3-312, 3-314, 3-324) say "Další cvik v
  parkuru musí být vybrán z těchto karet: …". The next card must come from that list
  (`nextOneOf`), and the listed recall / return cards (2-213–2-216, 3-302, 3-308, 3-309,
  3-319–3-322) are **never dealt on their own** (`onlyAfterLeave`). Codes outside the
  dealt class are ignored (RO2 decks never contain 3-3xx follow-ups).
- **After a static exercise.** 2-218 and 3-314 ("z poslední pozice") must follow a card
  that ends static (`afterStatic`).
- **Dog's side.** §4.2: "Psovod vede psa standardně po své levé straně, pokud není řádem
  nebo rozhodčím stanoveno jinak" — so only a card or the judge (a start "na pravou
  ruku", marked "R") sets it. The side-change cards 1-123–1-125, 2-232, 3-325–3-327 switch
  it ("Strana vedení je změněna", 1-125), and příloha 2 penalises "Pes svévolně změní
  stranu u nohy" and "Provedení cviku na špatné straně u nohy" — so a change **holds
  until another card changes it**. Nothing requires ending on the left; the team goes to
  the finish on its current side (also confirmed by the author, 2026-09-27). The dealer
  tracks the side (`sideChange`) and shows it.
- **Last card only.** RO-V: Z-016 and 1-110 only as the last card.
- **Tracked changes in the PDF.** The 2026 regulation was published with struck-through
  text still in it; `pdftotext` returns deleted and new wording side by side. Found with
  `scripts/content/strikethrough.py` and removed during proofreading — among them two
  follow-ups of 3-311 (p. 55).

**FCI-ROB** (Czech translation, valid from 1 Feb 2025 — it also has tracked changes)

- **Placement letters.** The (A)/(B)/(C)/(D) after an FCI card name is _where_ the
  exercise is done (§4.3: left of the card, in front of it, at the recall cone, jumps),
  not the national static/dynamic type — stored as `placement`.
- **Pace.** "Pouze plynulé jednobodové cviky (cviky 105-113) mohou být prováděny v
  pomalém nebo rychlém tempu" (p. 19); the pace "musí být dodrženo, dokud jej nezmění
  karta s novým tempem nebo dokud tým nedosáhne karty Cíl" (p. 15). The sentence that
  _always_ required 118 after slow/fast pace is struck through, so another pace card may
  follow directly. Class flag `paceCompatibleOnly`, card flag `paceCompatible`.
- **Dog's side.** 310–316, 405, 406 change it ("Tímto cvikem se mění strana vedení
  psa"); ten cards end with "Návrat k vedení po levé straně" (`endSide: 'left'`); 417
  only with the dog left and ends right, 418 the mirror (`sideOnly` + `endSide`).
- **Leave → optional recall.** 319, 408, 409 leave the dog; a recall card 321–323,
  421, 422 _may_ follow ("Tato karta může být použita pouze po kartách 319, 408 a 409"),
  otherwise the recall at a cone is part of the exercise (`mayBeFollowedBy`); recall
  cards are never dealt on their own.
- **Repetition.** "Jednu kartu lze v jednom parkuru použít maximálně dvakrát"
  (`maxRepeats: 2`; main cards are dealt at most once anyway, recall cards can repeat).
- **Point mix** (≥ 7 four-point, ≥ 5 three-point) is a competition-course rule — R7.

**Both:** no card twice in a row; equipment filter (§3).

**Implementation.**

The metadata lives on each card as `sequencing` (`packages/content/src/schema.ts` is the
source of truth): `requiresSupplementary`, `pace`, `nextOneOf`, `onlyAfterLeave`,
`afterStatic`, `sideChange`, `lastOnly`, `equipment`; FCI adds `mayBeFollowedBy`,
`endSide`, `sideOnly`, `paceCompatible`, and the class flags `paceCompatibleOnly` and
`maxRepeats`.

- `dealDeck(class, options, seed)` — pure function, seeded PRNG, builds the sequence
  step by step over a small state (current pace, current side, used counts), drawing only
  from cards valid in that state, with bounded retry/backtracking. If the card pool is
  too small for the requested count, it returns fewer cards and says so.
- `validateDeck(class, deck)` — independent validator returning the list of broken rules.
- Tests: every rule has a unit test; a property test deals thousands of decks per class
  and option combination and asserts `validateDeck` finds nothing.
- Each metadata field is filled in during R1/R2 proofreading, citing the regulation
  paragraph in a comment where the rule comes from.

## 6. Random cards mode (R3) — the core of the MVP

- **Setup screen:** §3.
- **Deck screen:** one card full screen (main card + D0 side by side when paired); next /
  previous by swipe, tap zones and buttons; "3 / 20" progress; current pace and (FCI)
  dog's side shown as small badges; reshuffle; description toggle; wake lock on while the
  deck is open. Start and finish are not dealt as cards.
- The deck lives in the URL (class + options + seed), so a reload or a shared link
  reproduces the same order.

## 7. Card catalogue (R4)

All cards of a class with thumbnails; filter by class, "new in this class", type A/B,
FCI points, equipment; search by code or name. Detail = full image, description,
sub-parts, sequencing notes in plain Czech, classes that use it.

## 8. PWA (R5)

Web app manifest (name "ROTA", icons, `display: standalone`, theme colour), service
worker precaching the app shell, content and **all card images** so the app works fully
offline on a field. Tool: Serwist — verified in R0: bundle `sw.ts` with
`bun build`, then `@serwist/build` `injectManifest` over `out/` after `next build`.
Bundler-independent, no Next/Turbopack plugin. iOS has no install prompt: a one-time "Přidej si ROTA na
plochu" hint with the Safari share-sheet steps.

## 9. After the MVP (R7–R9)

**R7 — Competition-course generator** (`/trida/<class>/parkur`). A full course the way a
judge would build one: the class's course size (min–max, default max), all equipment,
start side stated, start → numbered cards (with their D0 cards) → finish. FCI adds the
point mix of §3.5 — **≥ 7 four-point and ≥ 5 three-point cards**. Only ~4 % of random
decks meet it by chance, so the dealer gets a `competition` option: candidates whose
points still have an unmet quota are drawn with more weight, and once the remaining
slots only just cover the missing cards, only those are allowed. `validateDeck` checks
the mix independently. The course lives in the URL like a deck (`parkur=1` marks the
competition rules), is printable (print stylesheet), shareable, and can be walked
through as a deck.

**R8 — Quiz** (`/trida/<class>/kviz`), two modes over a class's exercises:

- **Recall** — the card is shown; think what exactly to do; reveal name, description
  and sub-parts; answer "Vím" / "Nevím".
- **Pick** — the card is shown with three descriptions (the right one + two from the
  same class, preferably the same type or points); tap one, see if it was right.

Answers are counted per card in local storage (D2). The next card is drawn weighted:
unseen and often-missed cards come more often, mastered ones less. A short summary
("umíš X z Y") and a reset. Pure logic in `lib/quiz.ts`, tested.

**R9 — Voice.** With "Číst nahlas" on (setup option, remembered, and a toggle on the
deck screen), each new card's Czech name is spoken with the Web Speech API
(`speechSynthesis`, a `cs-CZ` voice when available): "Karta 3. Obrat vpravo za chůze.",
with its D0 card, the pace and a side change announced when they change. The phone can
stay in the pocket for the name; the card is there when needed. The announcement text is
a pure, tested function; speaking only happens on a user's tap/swipe (iOS requires a
gesture for audio).

## 10. Open items

- Own domain? Live at `rota.rock8cloud.app` for now.
- English UI for FCI-ROB — later, i18n is ready (D6).

## 11. Checklist

### R0 — Scaffold

- [x] `git init`, `.gitignore` (incl. `podklady/`), Bun workspaces: `apps/web`, `packages/content`, `packages/eslint-config`
- [x] Next.js 16 + React 19 + TS, `output: 'export'`, Tailwind 4, shadcn/ui (base-ui), lucide, i18next with `cs.json`
- [x] Prettier (+ tailwind plugin), ESLint, lefthook, `bun test` wiring — same config as Malibo
- [x] Verify Serwist with Next 16 + static export (decides R5 approach) — works: `serwist` + `@serwist/build` `injectManifest` over `out/` after `next build`, no bundler plugin
- [x] `CLAUDE.md` with conventions (language policy, tykání, verification policy) pointing at this plan
- [x] README (what ROTA is, how to run, credits), LICENSE
- [x] CI workflow (format, typecheck, lint, test, build)
- [x] GitHub repository `konopi79/rota` — **private** until R6

### R1 — Content pipeline + national ruleset

- [x] Card image script: render, trim, webp full + thumb, contact sheet — `bun run cards:extract` (`scripts/cards/`); needs poppler + tesseract
- [x] National images extracted; page → code mapping verified against printed codes (OCR, 2-202 by eye) — 124 images, 3.5 MB
- [x] Content types + Zod schemas in `packages/content`
- [x] National classes RO-Z, RO1, RO2, RO3 (cumulative lists + new-card lists), RO-V (explicit list) with course rules
- [x] National cards: start, finish, D0a–d, Z-001…032, 1-101…125, 2-201…232, 3-301…327 — descriptions and sub-parts proofread (draft: `scripts/content/parse-cz.ts`; struck text: `strikethrough.py`)
- [x] National sequencing metadata (D0 pairing, pace, leave → follow-up, after-static, side change, last-only, equipment) with regulation references
- [x] Data-integrity tests (counts, images, codes, class lists, cumulative inclusion, rule consistency)

### R2 — FCI ruleset

- [x] FCI images extracted — rendered with **MuPDF** (the PDF does not embed its fonts; poppler draws empty boxes), page → code from the text layer; 91 images, 2.4 MB
- [x] FCI cards: code, points, placement, English name, Czech name + description (proofread; draft `scripts/content/parse-fci.ts`; this PDF has tracked changes too)
- [x] FCI-ROB class with course rules (18–20, off leash, max twice; point mix left to R7)
- [x] FCI sequencing metadata (pace + flowing 105–113, side changes, end sides, 417/418, optional recall cards after 319/408/409, max twice, equipment)
- [x] Data-integrity tests + validator unit tests for every FCI rule

### R3 — Random cards mode

- [x] `dealDeck` + `validateDeck` with seeded PRNG; unit tests per rule + property tests per class (`packages/content/src/deal/`)
- [x] Setup screen (class, whole / new-only, count, equipment, start side, description)
- [x] Deck screen: full-screen card, main + D0 pairing, swipe + tap + buttons, progress, pace/side badges, reshuffle
- [x] Description toggle, wake lock
- [x] Deck state in the URL (class + options + seed)
- [x] Last setup remembered in local storage (`lib/storage.ts`, tested)

### R4 — Card catalogue

- [x] List with thumbnails, filters (new-in-class, type A/B/D0 or FCI points, without equipment), diacritics-insensitive search — `/trida/<class>/karty`
- [x] Card detail (image, execution diagram, description, sub-parts, sequencing rules in words, equipment, classes, source page) — `/karta/<ruleset>/<card>`, all 215 prerendered

### R5 — PWA

- [x] Manifest + icons (`app/manifest.ts`, icon drawn in `app/icon.svg`, PNGs by `apps/web/scripts/icons.ts`; square variants for iOS and maskable)
- [x] Service worker precaching shell, content and all card images (1 611 files, 17.6 MB) — tested offline on the production image by stopping the server: fresh page loads, a deck from its URL and card images all work. Tried on an iPhone by the author after the deploy (2026-09-27): works.
- [x] Install hint on the home screen until dismissed: iOS Safari steps, Chrome/Android install button (`beforeinstallprompt`)

### R6 — Deploy + open-source release

- [x] Dockerfile: Bun build → `nginx-unprivileged` serving `out/` on **port 3030**, security headers, `/healthz`, verified in CI
- [x] rock8.cloud service, HTTPS — live at https://rota.rock8cloud.app (2026-09-27; the first deploys failed on a rock8 registry outage, fixed by rock8 support)
- [x] About page (`/o-aplikaci`): unofficial training aid, sources and regulation versions, credits, privacy, offline, link to the repo
- [ ] Make `konopi79/rota` public

### R7 — Competition-course generator

- [x] Dealer `competition` option: class course size, FCI point-mix quota (weighted + forced), validator check; tests
- [x] Course page: numbered list start → cards (+ D0, side and pace notes) → finish, FCI points total
- [x] Course in the URL (seed + options), new course, print stylesheet, share, "projít jako balíček"
- [x] Entry point on the setup screen

### R8 — Quiz

- [x] `lib/quiz.ts`: weighted next card, distractor descriptions, answer stats (local storage); tests
- [x] Recall mode (reveal, "Vím / Nevím")
- [x] Pick mode (three descriptions)
- [x] Progress summary + reset; entry point on the setup screen

### R9 — Voice

- [ ] Announcement text (card, D0, pace, side change) as a pure function; tests
- [ ] Speech on the deck screen: setup option (remembered) + toggle in the deck header, `cs-CZ` voice
- [ ] Tried on an iPhone (Safari and home-screen app)

Each phase ends green on `bun run format && bun run typecheck && bun run lint` plus its
own tests, and is committed separately.

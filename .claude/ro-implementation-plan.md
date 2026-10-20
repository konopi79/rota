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

| #   | Phase                                         | Status        |
| --- | --------------------------------------------- | ------------- |
| R0  | Scaffold (monorepo, tooling, CLAUDE.md)       | ✅ 2026-09-27 |
| R1  | Content pipeline + national ruleset (CZ 2026) | ✅ 2026-09-27 |
| R2  | FCI ruleset                                   | ✅ 2026-09-27 |
| R3  | Random cards mode (rule-aware dealing)        | ✅ 2026-09-27 |
| R4  | Card catalogue                                | ✅ 2026-09-27 |
| R5  | PWA: offline + install                        | ✅ 2026-09-27 |
| R6  | Deploy + open-source release                  | ✅ 2026-09-27 |
| R7  | Competition-course generator                  | ✅ 2026-09-27 |
| R8  | Quiz                                          | ✅ 2026-09-27 |
| R9  | Voice: cards read aloud                       | ✅ 2026-09-27 |
| R10 | FCI decks laid out on the field               | ✅ 2026-10-19 |
| R11 | Hand-made course                              | ✅ 2026-10-19 |

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
Nothing personal is sent anywhere. ~~No analytics.~~ **Changed 2026-09-28:** the author
wants to know how many people use ROTA, so a cookieless counter (GoatCounter,
`lib/analytics.ts`) sends the visited page — a deck or course by class only — the
referrer, the screen width and once per launch whether it runs from the home screen.
Nothing is stored on the device, hence no consent banner; the About page says so.
**Changed 2026-10-20:** script errors are reported to the same counter (`lib/error-report.ts`)
— the error, where it happened and the **full** page address, a deck's seed and position
included, so the error can be repeated (an installed app "opened but did nothing" for a
handler and could not be reproduced). The address holds no personal data; the About page
says so.

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
  tracks the side (`sideChange`) and shows it, the finish included.
- **D0 ends on the left.** All D0a–d bring the dog "u levé nohy" (p. 17, `endSide:
'left'`); the dealer ignored it, so a deck from a start "R" showed "pes vpravo" even
  after a předsednutí with D0a (handler feedback, 2026-10-19).
- **Right-hand stretches on a course** — not in the regulation (which even writes Z-010,
  1-116, 3-319, 3-320, 3-322 for either side) but in the judges' guidelines,
  `ro-smernice-pro-posuzovani-2025.pdf` (Klub Obedience CZ, in `podklady/`, from
  obedience.cz), §1.2.3–1.2.5 (p. 6–7):
  - RO1: one of 1-123–1-125, "povolena pouze JEDNA změna strany" — a start "R" to the
    first card (which changes the side), or the last card to the finish.
  - RO2: that, plus one change mid-course whose next exercise changes straight back; or a
    start "R" to the first card and the last card to the finish. Nothing else.
  - RO3: the same with a start "R" up to card 2, the change to the finish on the
    second-to-last card at the earliest, and at most one exercise on the right mid-course
    (return-to-dog cards excepted — the dealer simply never puts a leave card there).
  - RO-Z, RO-V: no side-change cards; the guidelines say nothing. A start "R" is fine in
    RO-Z (author, 2026-10-19): the dog stays on the right until a D0 card brings it to
    the left leg — no pattern applies, `course.rightHand` stays unset.

  Only **competition courses** follow them (`course.rightHand`; the dealer plans the
  change positions up front in `deal/side-plan.ts`, the validator re-reads them off the
  sequence). On the right a course deals no D0 exercise — the D0 would take the dog back
  to the left, a change the patterns do not allow. Training decks keep only the
  regulation: a whole class does not fit these patterns (RO1 has three side-change cards).

- **More course rules from the same guidelines** (competition courses only, tracked while
  dealing by `deal/course.ts`, re-checked by `validateDeck`):
  - **Repeats** (§1.2.1, p. 5): every card once, follow-ups and D0 cards included —
    except D0a–d twice, Z-001/006/007/008/009/011/012/017/028/029 three times, Z-014 four
    times in RO-Z (`course.repeats`). The "třikrát" list repeats D0a–d, a leftover: the
    regulation's minimum card set (§5.4, p. 11) has two of each D0, three of the ten.
  - **Required exercises** (§1.2.2–1.2.6, p. 6–8, `course.required`), e.g. RO2 a recall
    2-213–2-216 (so a leave card before it), a jump, a turn, a stand and two more RO2
    cards. Each requirement takes a different card (the validator matches them
    bipartitely — 2-225 is a turn and a stand but counts once). The dealer prefers cards
    that fill a missing one and only deals those once the remaining positions just cover
    them, like the FCI point mix. RO-V's list names 1-114/1-115, which are not RO-V cards.
  - **RO-Z about 50/50 static and dynamic** (§1.1.1, p. 2, "v podstatě"): within one of
    half (`course.staticShare`); for "A nebo B" cards the D0 card is chosen to keep it.
  - **CNDC limits** (§1.1.1, §1.1.6): ROTA builds every card as its own station, never a
    CNDC, so the limits hold trivially. Distances and card placement (§1.1.2–1.1.4) need
    a field plan, which national courses do not have.

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

**FCI field layout (R10).** A sequence can be valid card by card and still walk the team
off the field — five "straight on" cards in a row (user feedback, 2026-10-19). FCI decks
are therefore laid out on the field while they are dealt:

- Field 20 × 20 m (§3.3, "minimálně"); the start anywhere on an edge, facing in.
- Cards "přibližně 3-5 m" apart (§3.5), measured from where the previous exercise ends;
  the recall cone 5 m ahead of the card and the next card 5 m past it (§3.5, §4.8);
  recall cards at their stated distance straight ahead of the leave card (3–5 m, 421: 8 m).
- Each card's `geometry`: its turn (107/108: 180–270°), where the team leaves it, and its
  cones, bowls and jumps; jumps on the dog's side, at most two per field (§3.5).
- **The direction changes only on the cards** (author, 2026-10-21; §3.5: "Cviky musí být
  umístěny přirozeně ve směru postupu týmu"): between two cards the team walks straight on
  the way the exercise ends. ~~Free 90°/45° corners between cards~~ — first at the card,
  then 1–3 m on (2026-10-20) — still read as wrong turns on the plan ("pokaždé to netrefilo
  směr", a handler, 2026-10-20/21). After a turn about on the spot (307, 308, the recall
  cards, …) the team walks back 1–3 m beside its way in, on the side it turned, drawn as a
  hairpin; the recall cards turn about either way (the regulation does not say).
- Without free corners a course fits a 20 × 20 m field only with some search: the dealer
  takes cards back on a dead end (`BACKTRACKS`), prefers cards that change direction when
  the way ahead is short (`FieldPlanner.runway`) and a place with room to go on — ~25 ms
  a course, none of 3 000 short. Only decks up to one course (20 cards) are laid out: a
  second field dealt from what the first one left ran out of cards that change direction
  (rounds of 3–5 cards), so longer decks go without a plan (author, 2026-10-21) — as
  does a training deck that fits on no field (not seen in tests).
- Steps back (305, 306, 412, 413) keep 1.5 m clear of the other exercises, their cards and
  equipment — a deck stepped back through the previous card — and the team walks on from
  the card, so the next one is measured from there. Cards stand where
  §4.3 puts them (A: right of the team, B: ahead) and stay ≥ 3 m apart; equipment ≥ 1.5 m
  from other exercises (§3.5: not "nepřiměřeně" close to other cards).
- After the recall cards 321–323, 421, 422 ("Psovod se otáčí čelem vzad … tým pokračuje
  vpřed") the team carries on in the reversed direction — **confirmed** on four judges'
  course plans (2024–2025, incl. the 2025 World Championship), which also follow nearly
  every leave card with a recall card; the dealer now does so about half the time.
- The field plan is drawn like those plans: 1 m grid labelled every 5 m, card images
  turned to face the team, numbers in circles, cones as red dots. Two of the four plans
  use a 30 × 20 m field.
- National classes are not laid out: one station can hold several exercises there.

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
plochu" hint with the share-sheet steps (any iOS browser since iOS 16.4 — all are WebKit).

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

- ~~Own domain — not now~~ **`rotapp.cz`** since 2026-09-28 (rota.cz and rota.app were taken). Open: what to do with `rota.rock8cloud.app` — it keeps serving the app, because home-screen apps installed from it would stop updating behind a redirect (and local storage does not move to a new origin).
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
- [x] Main and minor parts (handler feedback, 2026-10-19): every sub-part labelled "hlavní" / "vedlejší" with what a missing one costs — main 10 points, minor 5 (Směrnice §3.3–3.4, p. 10), a repeat 5 (řád p. 16), so a repeat pays off only for a main part (`components/sub-parts.tsx`); also in the deck's description panel. 14 tables have no main part marked in the 2026 regulation (Z-003, Z-024, Z-032, 1-102, 1-107, 1-108, 2-210, 2-213, 2-221, 2-222, 2-227, 2-228, 3-304, 3-305 — checked on the rendered pages); the app says so instead of guessing, and a data test pins the list

### R5 — PWA

- [x] Manifest + icons (`app/manifest.ts`, icon drawn in `app/icon.svg`, PNGs by `apps/web/scripts/icons.ts`; square variants for iOS and maskable)
- [x] Service worker precaching shell, content and all card images (1 611 files, 17.6 MB) — tested offline on the production image by stopping the server: fresh page loads, a deck from its URL and card images all work. Tried on an iPhone by the author after the deploy (2026-09-27): works.
- [x] Install hint on the home screen until dismissed: iOS share-sheet steps (Safari, Chrome and the rest — all WebKit), Chrome/Android install button (`beforeinstallprompt`)
- [x] Installed app updates itself: iOS resumed the home-screen app from memory and kept an old version (found by the author, 2026-09-27) — now a check on every return to the screen, reload once hidden (`lib/sw-update.ts`, tested); build time at the bottom of `/o-aplikaci`

### R6 — Deploy + open-source release

- [x] Dockerfile: Bun build → `nginx-unprivileged` serving `out/` on **port 3030**, security headers, `/healthz`, verified in CI
- [x] rock8.cloud service, HTTPS — live at https://rota.rock8cloud.app (2026-09-27; the first deploys failed on a rock8 registry outage, fixed by rock8 support)
- [x] About page (`/o-aplikaci`): unofficial training aid, sources and regulation versions, credits, privacy, offline, link to the repo
- [x] Ready for public: history checked (no PDFs, secrets or service IDs ever committed), README (live link, how to report a card error, MIT covers the code only — not the card graphics), CI `permissions: contents: read`, issue form "Chyba v kartě nebo pravidle"; GitHub: homepage + topics, `main` ruleset (no force push / deletion), Dependabot alerts, secret scanning + push protection, private vulnerability reporting (2026-09-27; the last three need a public repo — done right after the switch)
- [x] `konopi79/rota` made public (2026-09-27); the ruleset, secret scanning and private vulnerability reporting could only be switched on after that
- [x] Visit counter (2026-09-28): GoatCounter `rotapp`, cookieless, own `/count` requests instead of count.js (client-side navigation, decks counted by class only, launches from the home screen vs. browser), CSP allows `rotapp.goatcounter.com`, privacy texts and D2 updated (`lib/analytics.ts`, tested)
- [x] Error reports (2026-10-20): uncaught errors, rejected promises and a failed service worker install as GoatCounter events `chyba: <error> (<source>) @ <full page address>`, listeners installed before hydration, each error once and at most 5 per page load (`lib/error-report.ts`, tested); privacy texts and D2 updated
- [x] Own domain `rotapp.cz` (2026-09-28): Blueboard DNS (A + AAAA per rock8, DNSSEC), rock8 custom domains `rotapp.cz` + `www.rotapp.cz` with Let's Encrypt; `www` → 301 to the apex in nginx (an explicit `www` A/AAAA was needed — the rock8 challenge TXT under `www` stops the `*` wildcard from answering for it); guide, README, GitHub homepage point to `rotapp.cz`

### R7 — Competition-course generator

- [x] Dealer `competition` option: class course size, FCI point-mix quota (weighted + forced), validator check; tests
- [x] Course page: numbered list start → cards (+ D0, side and pace notes) → finish, FCI points total
- [x] Course in the URL (seed + options), new course, print stylesheet, share, "projít jako balíček"
- [x] Entry point on the setup screen
- [x] Whole course on one screen (user request, 2026-10-19): the phone stands a few metres away, so "Na jednu obrazovku" shows all cards numbered in a grid as big as the screen allows (`lib/grid.ts` picks the column count — two columns do not fit 20 cards on a phone), screen kept awake
- [x] Dog's side on national courses (2026-10-19): D0a–d end on the left; right-hand stretches per the judges' guidelines §1.2.3–1.2.5 (RO1 one change, RO2/RO3 start/finish + one mid-course, `deal/side-plan.ts`, validator, property test); finish side shown and spoken; guidelines credited on `/o-aplikaci`
- [x] National courses per the guidelines (2026-10-19): card repeats (§1.2.1), required exercises per class (§1.2.2–1.2.6, matched in the validator), RO-Z static/dynamic balance (§1.1.1) — `deal/course.ts`; feature item `national-course`

### R8 — Quiz

- [x] `lib/quiz.ts`: weighted next card, distractor descriptions, answer stats (local storage); tests
- [x] Recall mode (reveal, "Vím / Nevím")
- [x] Pick mode (three descriptions)
- [x] Progress summary + reset; entry point on the setup screen

### R9 — Voice

- [x] Announcement text (card, D0, pace, side change) as a pure function; tests (`lib/announce.ts`)
- [x] Speech on the deck screen: setup option (remembered) + toggle in the deck header, `cs-CZ` voice (`lib/speech.ts`; `hlas=1` in the URL)
- [x] Tried on an iPhone (home-screen app, speech included) by the author, 2026-09-27

### R10 — FCI field layout

- [x] Card `geometry` for every FCI exercise with a turn, a reach or equipment, with regulation pages; class `course.field` 20 × 20 m
- [x] `FieldPlanner` lays the deck out while dealing (start on the edge, 3–5 m, recall cone / recall cards, ≤ 90° between cards, clearances, ≤ 2 jumps, room kept for the finish); ~~decks longer than a course split into even rounds~~ — since 2026-10-21 only decks up to a course are laid out
- [x] `validateDeck` checks the layout independently; property test over 600 FCI decks
- [x] SVG field plan on the course page and behind a map button in the deck (current card highlighted, round badge, "Nové kolo" hint)
- [x] Feedback from the same thread: the course is a "tréninkový parkur" (it cannot meet every judging rule) and shows no points total (points are difficulty, not a score)
- [x] Recall-card direction confirmed on judges' course plans (author, 2026-10-19); recall card after a leave card about half the time; plan drawn in the judges' style (card images, 1 m grid), bends on a 90°/45° lattice, card spacing measured where the cards stand
- [x] Steps back kept clear of other cards, the next card measured from the card (handler feedback, 2026-10-20); ~~corner between two cards 1–3 m on~~ (replaced next day)
- [x] Direction changed only by the cards (author, 2026-10-21): straight walks, a hairpin back beside the way in after a turn about (`HAIRPIN_WIDTHS`), recall cards turn either way; dealer backtracking + runway weighting; layout only up to a course; validator + tests

### R11 — Hand-made course

- [x] Validator returns structured issues (`CardIssue`: rule, card index, what would fix it); `validateDeck` keeps its English messages on top of them
- [x] `customDeck` (order → deck with side and pace) + `customDeckIssues` (regulation rules only, no "dealt twice", no layout); tests incl. every dealt deck replayed by hand
- [x] Editor `/trida/<class>/vlastni`: search by code or name, D0 choice, move / remove, start side, follow-up chips after a leave card, warnings in Czech at each card; kept in local storage per class
- [x] Course in the URL (`poradi=`): walk as a deck (edit instead of reshuffle), course page with the warnings, print, share; "Upravit" on a dealt course or a shared link opens it in the editor (asks before replacing a course in progress)
- [x] Switch "Kontrolovat dle směrnic" for national classes (author, 2026-10-19): the guidelines' checks as structured issues with Czech messages (required exercises labelled in `cz/classes.ts`), course-wide warnings above the cards; test: every dealt national course replayed by hand passes
- [x] Sharing from the editor ("Sdílet" → the course page) and "Kontrolovat pořadí" to switch the checks off for a short sequence (author, 2026-10-19; `kontrola=0`, `lib/share.ts`)
- [x] Tried on a phone by the author after the deploy (2026-10-19)

Each phase ends green on `bun run format && bun run typecheck && bun run lint` plus its
own tests, and is committed separately.

## 12. Hand-made course (R11)

Requested by users (2026-10-19): enter a whole course by hand — typically a course plan
from a training or a competition — and walk it like a deck.

- **The order is the user's.** The editor never refuses or reorders a card; it checks the
  order against the sequencing rules of §5 and shows each broken rule at its card in
  plain Czech, with what would fix it ("Po kartě 2-211 musí následovat 2-213, …"). The
  check is the independent validator of D8 — the same code that verifies the dealer.
- **Only regulation rules.** "Dealt twice" is the dealer's policy, not a rule: the national
  regulation (§5.4) only sets the course size and card range, so a card may come twice;
  FCI keeps its "maximálně dvakrát". Course size and the FCI point mix are not checked —
  a training course can be any length. The regulation's own side rule applies: a D0
  card brings the dog back to the left leg.
- **"Kontrolovat dle směrnic"** (national classes, off by default, remembered with the
  course, `smernice=1` in the URL) adds the judges' guidelines of §5: card repeats,
  required exercises, RO-Z's balance, right-hand stretches. Course size stays out even
  then. Never "závodní" in the label — the course is a training one (see R10 feedback).
  The validator reports the guidelines as structured issues like the rest; each required
  exercise has a short Czech `label` in `cz/classes.ts` for the warning.
- **No field layout.** A hand-made FCI course is not laid out (the planner places cards
  while dealing; a fixed order may not fit). Possible later: lay out a given order.
- **Shared by a trainer** (author, 2026-10-19): a whole course or just a sequence of a few
  exercises. "Sdílet" in the editor sends the course page (`/parkur?poradi=…`) — the
  recipient walks it, prints it or takes it into their own editor. "Kontrolovat pořadí"
  (on by default, `kontrola=0` in the URL when off) silences every warning, for the
  sender and the recipient: a five-card sequence needs no follow-up rules.
- **Where it lives.** The course being edited is in local storage per class (D2); walking,
  printing and sharing put it into the URL (`poradi=Z-003,Z-014.D0a,2-211`) like a deck.

# ROTA — Rally Obedience Training App

Implementation plan (with the checklist to tick): @.claude/ro-implementation-plan.md

## Project Overview

Free, open-source PWA for rally obedience training. The handler picks one class — RO-Z,
RO1, RO2, RO3, RO-V (Czech national regulations 2026) or FCI-ROB — and the app deals
that class's cards in random order, full screen, one at a time. The dealt order must
always be **performable with a real dog** (plan §5). No accounts, no backend: anything
remembered is stored in the browser's local storage.

Typical use: glance at the card, phone into the vest pocket, perform the exercise, next
card. Every screen is designed for that — one glance, big targets.

> **Language policy:** all code, comments, documentation and technical `.md` files are in
> **English**. Only the user-facing UI strings are Czech (via i18n). Conversation with the
> user happens in Czech. All Czech copy uses **informal address (tykání)**, never formal
> "vy", and is phrased **genderlessly** — the reader is always unknown.

## Post-Change Verification (ASK, don't run on every change)

**Do not run the checks after every edit.** When the work is finished, **ask whether to
run them** and run whichever the user picks.

1. **Format**: `bun run format`
2. **Typecheck**: `bun run typecheck` — must pass with 0 errors
3. **Lint**: `bun run lint` — must pass with 0 errors (warnings are OK)
4. **Tests**: `bun test` (or a single file: `bun test packages/content/src/__tests__/x.test.ts`)
5. **Build**: `bun run build` — the static export fails on things the dev server allows
   (see "Static export" below), so run it after touching routing or data loading.

Report the outcome honestly — "not run yet" is a fine answer, "done" for something
unverified is not.

## Tech Stack

Same stack as Malibo and Zkofno, minus the backend (plan D1):

- **Runtime / package manager / tests**: Bun (workspaces monorepo, `bun test`)
- **Framework**: Next.js 16 (App Router, Turbopack) with **`output: 'export'`** — static files only
- **UI**: React 19, Tailwind CSS 4, shadcn/ui v4 (`base-nova` style on `@base-ui/react`), lucide icons
- **i18n**: i18next + react-i18next, strings in `apps/web/src/i18n/cs.json`
- **Validation**: Zod 4
- **Offline (R5)**: Serwist via `@serwist/build` `injectManifest` run **after** `next build`
  over `out/` — bundler-independent, verified in R0; no Next/Turbopack plugin needed

## Monorepo Structure

```
apps/web/                 Next.js app (static export → apps/web/out/)
packages/content/         Card data, class definitions, dealing rules (pure TS, Zod)
packages/eslint-config/   Shared ESLint config for the packages
podklady/                 Source PDFs of regulations and cards — NOT committed (gitignored)
.claude/                  Implementation plan
```

## Commands

```bash
bun install
bun run dev         # http://localhost:3004
bun run build       # static export into apps/web/out/
bun run lint
bun run typecheck
bun test
bun run format
```

## Deployment (rock8.cloud)

rock8.cloud builds the image from `apps/web/Dockerfile` (context = repo root): Bun builds
the static export, `nginxinc/nginx-unprivileged` serves `apps/web/out` on **port 3030**.
No runtime env vars. Health check: `GET /healthz` → `ok`.

- nginx config: `apps/web/docker/nginx.conf`; security headers (CSP etc.) in
  `apps/web/docker/security-headers.conf` — every `location` must `include` it, because
  a location's own `add_header` drops all inherited ones.
- Caching: `/_next/static/` immutable, `/cards/` one day, pages and `/sw.js` `no-cache`.
- CI builds the image on every push (verification only, not pushed anywhere).
- Local check: `docker build -f apps/web/Dockerfile -t rota . && docker run -p 3030:3030 rota`

## Conventions

- Prettier: no semicolons, single quotes, trailing commas, width 100 (same as Malibo).
- `import type` for type-only imports.
- **shadcn/ui is base-ui, not Radix**: compose with `render={<Link />}`, never `asChild`.
- **`cn` comes from `@/lib/utils`** (clsx + tailwind-merge, as in Malibo). The current
  shadcn CLI generates `import { cn } from "cn"` (a separate package we don't use) — fix
  the import in every component it adds, then run `bun run format` on it.
- Semantic colour tokens only (`bg-card`, `text-muted-foreground`), never raw `gray-*`/hex.
- React 19: no `setState` inside `useEffect` to reset state — remount with a `key`.
- Pages that use hooks (`useTranslation`, state) are client components (`'use client'`);
  they are still prerendered to HTML by the static export.

## Static export (`output: 'export'`)

Everything is prebuilt; there is no server at runtime. Consequences:

- No API routes, no server actions, no `cookies()`/`headers()`, no middleware/proxy.
- `next.config` `headers()` / `redirects()` do nothing — security headers belong to the
  static server config (R6).
- Dynamic routes need `generateStaticParams`; prefer search params for deck state.
- `useSearchParams()` must sit under a `<Suspense>` boundary or the build fails.
- `images.unoptimized` is on; card images are pre-sized webp (plan §4).

## Content rules (`packages/content`)

- Card texts and sequencing rules come from the regulations in `podklady/` and are
  **proofread by hand** — PDF extraction mangles lines and tables, and a wrong rule is
  worse than none. Cite the regulation page in a comment next to each sequencing rule.
- `packages/content/src/cz/*.ts` are **hand-maintained**. They were bootstrapped from the
  draft of `scripts/content/parse-cz.ts`; that script stays for the next regulation
  version — re-run it and diff its draft against the previous one to see what changed.
- **The national regulation PDF contains tracked changes**: struck-through (deleted) text
  is still in the text layer, so extracted text shows old and new wording side by side.
  Always check a new version with `scripts/content/strikethrough.py` (PyMuPDF, lives in
  `.cache/venv`) and drop the struck runs.
- Class card lists are explicit; never derive them from code ranges at runtime.
- `packages/content/src/schema.ts` is the source of truth for the data shape; every
  content change keeps the data-integrity tests green (`bun test packages/content`).

## Card images (`bun run cards:extract`)

`scripts/cards/extract.ts` renders the card PDFs (`scripts/cards/sources.ts` maps page →
code), crops each card to its printed frame, checks the page → code mapping by OCR of the
code printed on the card, and writes `apps/web/public/cards/<ruleset>/<code>.webp` plus
`thumb/`. Review `.cache/cards/contact-sheet.html` after every run. Needs `poppler` and
`tesseract` (`brew install poppler tesseract`). Work files go to `.cache/` — the
sandboxed tooling cannot read `/tmp`.

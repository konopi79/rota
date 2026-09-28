# ROTA — Rally Obedience Training App

A free, open-source web app for rally obedience training. Pick a class — **RO-Z, RO1,
RO2, RO3, RO-V** (Czech national regulations) or **FCI-ROB** — and ROTA deals the
exercise cards in random order, one at a time, full screen on your phone. The order is
always one you can actually perform with your dog: supplementary cards stay with their
exercise, a leave is followed by a recall, pace changes and the dog's side are respected.

**Try it: [rotapp.cz](https://rotapp.cz)** — no account, no cookies, only an anonymous visit counter;
add it to your home screen and it works offline on the training field. Everything it can
do is listed on its [About page](https://rotapp.cz/o-aplikaci) (Czech).

Also in the app: a card catalogue with descriptions and sequencing rules, a
competition-course generator, a quiz, and cards read aloud.

ROTA is an unofficial training aid. Card graphics and exercise descriptions come from the
official regulations — the Czech national rally obedience regulations (Zkušební řád Rally
Obedience v ČR, 2026) and the FCI Rally Obedience regulations (Czech translation valid from
1 February 2025) — and remain the work of their authors. The regulations in force are
always binding.

## Found a mistake?

A wrong card, description or sequencing rule is a bug — please
[open an issue](https://github.com/konopi79/rota/issues/new/choose) with the card code
and, ideally, the page of the regulation.

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev      # http://localhost:3004
bun run build    # static site in apps/web/out/
bun test
```

Tech stack: Bun · Next.js 16 (static export) · React 19 · Tailwind CSS 4 · shadcn/ui ·
i18next · Zod. The app is plain static files (served by nginx in `apps/web/Dockerfile`);
there is no backend.

- `packages/content` — cards, classes and the dealing rules (`dealDeck` / `validateDeck`),
  each rule citing the regulation page it comes from.
- `apps/web` — the app; UI strings in `apps/web/src/i18n/cs.json`.
- [`CLAUDE.md`](CLAUDE.md) — conventions and how things fit together;
  [implementation plan](.claude/ro-implementation-plan.md) — decisions and their reasons.

The regulation and card PDFs are **not** in this repository. The card images in
`apps/web/public/cards/` are generated from them by `bun run cards:extract`
(`scripts/cards/`) and committed, so you only need the PDFs to regenerate the images or
to update the content for a new regulation version.

## Licence

The **code** is under the [MIT licence](LICENSE). The MIT licence does **not** cover the
card graphics (`apps/web/public/cards/`) or the exercise descriptions taken from the
regulations — those remain the work of their authors and are included only so the app
shows the same cards a handler sees at a competition.

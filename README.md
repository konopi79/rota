# ROTA — Rally Obedience Training App

A free, open-source web app for rally obedience training. Pick a class — **RO-Z, RO1,
RO2, RO3, RO-V** (Czech national regulations) or **FCI-ROB** — and ROTA deals the
exercise cards in random order, one at a time, full screen on your phone. The order is
always one you can actually perform with your dog: supplementary cards stay with their
exercise, pace changes and (for FCI) the dog's side are respected.

No account, no tracking; works offline on the training field once installed.

> **Status:** in development — see the [implementation plan](.claude/ro-implementation-plan.md).

ROTA is an unofficial training aid. Card graphics and exercise descriptions come from the
official regulations — the Czech national rally obedience regulations (Zkušební řád Rally
Obedience v ČR, 2026) and the FCI Rally Obedience regulations (Czech translation valid from
1 February 2025) — and remain the work of their authors.

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev      # http://localhost:3004
bun run build    # static site in apps/web/out/
bun test
```

Tech stack: Bun · Next.js 16 (static export) · React 19 · Tailwind CSS 4 · shadcn/ui ·
i18next · Zod.

## Licence

Code: [MIT](LICENSE).

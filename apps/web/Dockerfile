# ROTA is a static site (`output: 'export'`, plan D3): Bun builds it, nginx serves it.
# No runtime env vars, no database — the image is the whole app.

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/content/package.json ./packages/content/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Not --frozen-lockfile: the lockfile is generated on macOS and the image is Linux
# (platform-specific optional packages differ) — same as Malibo.
RUN bun install

# ─── Stage 2: Build the static export ────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && bun run build

# ─── Stage 3: Serve ──────────────────────────────────────────────────────────
# The unprivileged image runs nginx as a non-root user, which is fine because we
# listen on 3030, not a privileged port.
FROM nginxinc/nginx-unprivileged:alpine AS runner

COPY apps/web/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=builder /app/apps/web/out /usr/share/nginx/html

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3030/healthz || exit 1

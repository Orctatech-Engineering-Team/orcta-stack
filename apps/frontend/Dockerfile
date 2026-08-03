# ─── Build ─────────────────────────────────────────────────────────────
FROM denoland/deno:debian-2.7.14 AS builder

WORKDIR /app

# Layer 1: Workspace skeleton (changes infrequently — preserves dep cache).
# Deno requires every deno.json under the workspace root to be a declared
# member (see docs/DENO_WORKSPACE_SCOPE.md), and `deno install` needs the
# full workspace + lockfile present to resolve pinned versions instead of
# silently re-resolving them — copying just apps/frontend's own files let
# npm deps drift on every build.
COPY deno.json deno.lock package.json ./
COPY apps/backend/deno.json ./apps/backend/
COPY apps/frontend/deno.json apps/frontend/package.json ./apps/frontend/
COPY packages/shared/deno.json ./packages/shared/
COPY packages/db/deno.json ./packages/db/
COPY packages/email-templates/deno.json ./packages/email-templates/
RUN cd apps/frontend && deno install

# Layer 2: Frontend source
COPY apps/frontend/ ./apps/frontend/
RUN cd apps/frontend && deno task build

# ─── Run (Caddy serves SPA + proxies /api/* to backend) ──────────────
FROM caddy:alpine

COPY --from=builder /app/apps/frontend/dist/ /srv/
COPY apps/frontend/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

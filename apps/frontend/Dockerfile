# ─── Build ─────────────────────────────────────────────────────────────
FROM denoland/deno:debian-2.7.14 AS builder

WORKDIR /app

# Layer 1: Config files (changes infrequently — preserves dep cache)
COPY apps/frontend/deno.json apps/frontend/package.json ./
RUN deno install

# Layer 2: Source
COPY apps/frontend/ ./
RUN deno task build

# ─── Run (Caddy serves SPA + proxies /api/* to backend) ──────────────
FROM caddy:alpine

COPY --from=builder /app/dist/ /srv/
COPY apps/frontend/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

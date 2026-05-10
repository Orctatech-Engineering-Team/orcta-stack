# ─── Build ─────────────────────────────────────────────────────────────
FROM denoland/deno:debian-2.7.14 AS builder

WORKDIR /app

# Layer 1: Configuration (changes infrequently — preserves dep cache)
COPY deno.json deno.lock ./
COPY apps/backend/deno.json ./apps/backend/
COPY apps/frontend/deno.json ./apps/frontend/
COPY packages/shared/deno.json ./packages/shared/
COPY packages/db/deno.json ./packages/db/
COPY packages/email-templates/deno.json ./packages/email-templates/

# Layer 2: Shared packages (change less often than app code)
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY packages/email-templates/ ./packages/email-templates/

# Layer 3: Application source
COPY apps/backend/ ./apps/backend/

# Cache dependencies (uses lockfile + import maps for npm resolution)
RUN deno cache apps/backend/src/index.ts

# Compile to standalone binary (includes Deno runtime + all deps)
RUN deno compile \
  --allow-env \
  --allow-net \
  --allow-read \
  --allow-sys \
  --allow-ffi \
  --output /usr/local/bin/orcta-backend \
  apps/backend/src/index.ts

# ─── Run ──────────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates && \
  addgroup -S app && adduser -S app -G app

COPY --from=builder /usr/local/bin/orcta-backend /usr/local/bin/orcta-backend

USER app

ENV PORT=9999

EXPOSE 9999

CMD ["orcta-backend"]

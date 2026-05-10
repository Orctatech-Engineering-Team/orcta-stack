# ─── Build ─────────────────────────────────────────────────────────────
FROM denoland/deno:alpine-2.1.4 AS builder

WORKDIR /app

# Layer 1: Configuration (changes infrequently — preserves dep cache)
COPY deno.json deno.lock ./
COPY apps/backend/deno.json apps/backend/deno.lock* ./apps/backend/
COPY packages/shared/deno.json ./packages/shared/
COPY packages/db/deno.json ./packages/db/
COPY packages/email-templates/deno.json ./packages/email-templates/
RUN deno cache apps/backend/src/index.ts

# Layer 2: Shared packages (change less often than app code)
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY packages/email-templates/ ./packages/email-templates/
RUN deno cache apps/backend/src/index.ts

# Layer 3: Application source
COPY apps/backend/ ./apps/backend/
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

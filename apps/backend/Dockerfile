# Build stage
FROM node:20-alpine AS builder
RUN corepack enable pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages and backend
RUN pnpm build:packages
RUN pnpm --filter backend build

# Produce a flat, symlink-free node_modules for the backend only.
# This is the canonical pnpm approach for Docker — avoids broken symlinks
# when the workspace virtual store is copied without its sibling package dirs.
RUN pnpm --filter backend deploy --prod /app/deploy

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Compiled application sources
COPY --from=builder /app/apps/backend/dist ./
# Flat node_modules from pnpm deploy (includes all workspace packages resolved)
COPY --from=builder /app/deploy/node_modules ./node_modules
# SQL migration files (needed by src/db/migrate.js at runtime)
COPY --from=builder /app/packages/db/migrations ./migrations

ENV NODE_ENV=production
ENV PORT=9999

EXPOSE 9999

CMD ["node", "src/index.js"]

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

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/backend/dist ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/dist ./node_modules/@repo/db/dist
COPY --from=builder /app/packages/shared/dist ./node_modules/@repo/shared/dist
COPY --from=builder /app/packages/email-templates/dist ./node_modules/@repo/email-templates/dist
COPY --from=builder /app/packages/db/migrations ./migrations

ENV NODE_ENV=production
ENV PORT=9999

EXPOSE 9999

CMD ["node", "src/index.js"]

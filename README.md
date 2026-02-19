# Orcta Stack

Full-stack TypeScript monorepo. Hono backend, React frontend, PostgreSQL.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Hono, Drizzle ORM, better-auth, Zod, Pino |
| Frontend | React 19, TanStack Router, TanStack Query, Tailwind v4 |
| Database | PostgreSQL, Redis (optional) |
| Tooling | pnpm, Biome, Vitest, GitHub Actions |

## Quick Start

```bash
# Prerequisites: Node 20+, pnpm

pnpm setup                    # Install deps + create .env
docker compose up -d          # Start PostgreSQL + Redis
pnpm db:migrate               # Apply migrations
pnpm dev                      # Backend :9999, Frontend :5173
```

## Commands

```bash
# Development
pnpm dev              # Start all
pnpm dev:backend      # Backend only
pnpm dev:frontend     # Frontend only

# Build & Quality
pnpm build            # Build all
pnpm typecheck        # Type check
pnpm lint             # Lint
pnpm test             # Test

# Database
pnpm db:migrate       # Apply migrations
pnpm db:generate      # Generate migration
pnpm db:studio        # Drizzle Studio

# Jobs
pnpm --filter backend jobs    # Run background workers

# Generators
pnpm new:module NAME  # Scaffold backend module
```

## Batteries Included

### File Uploads (S3/R2)
```typescript
import { getUploadUrl, getDownloadUrl } from "@/lib/storage";

const uploadUrl = await getUploadUrl({ key: "uploads/file.pdf" });
```

### WebSockets
```typescript
import { wsManager } from "@/lib/ws";

wsManager.broadcast("room-1", { type: "message", data: "hello" });
```

### Rate Limiting
```typescript
import { rateLimit, authRateLimit } from "@/lib/rate-limit";

app.use("/api/*", rateLimit({ max: 100 }));
app.post("/api/auth/*", authRateLimit);
```

### Background Jobs
```typescript
import { addJob } from "@/jobs";

await addJob("email", { to: "user@example.com", template: "welcome", data: {} });
```

## Project Structure

```
apps/
  backend/
    src/
      modules/      # Feature modules
      lib/          # Utilities (storage, ws, rate-limit, redis)
      jobs/         # Background job workers
      middlewares/
  frontend/
    src/
      routes/       # TanStack Router pages
      lib/          # API client, auth

packages/
  db/               # Drizzle schemas
  shared/           # Shared types
  email-templates/  # Email builders

docs/
  DEPLOYMENT.md     # Deploy guide
```

## Architecture

```
Route → Handler → Use-Case → Repository → Database
```

Use-cases return discriminated unions. See `apps/backend/docs/ARCHITECTURE.md`.

## Environment

See `.env.example` for all options. Required:

```bash
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=<32+ chars>
```

## Deploy

- **Backend**: Docker or PM2 on VPS
- **Frontend**: Vercel

See `docs/DEPLOYMENT.md`.

## License

MIT

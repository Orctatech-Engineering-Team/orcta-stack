# Orcta Stack

Full-stack TypeScript monorepo. Hono backend, React frontend, PostgreSQL.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Hono, Drizzle ORM, better-auth, Zod, Pino |
| Frontend | React 19, TanStack Router, TanStack Query, Tailwind v4 |
| Database | PostgreSQL |
| Tooling | pnpm, Biome, Vitest |

## Quick Start

```bash
# Prerequisites: Node 20+, pnpm, PostgreSQL

# Setup
pnpm setup                    # Install deps + create .env

# Configure database in .env, then:
docker compose up -d          # Or use existing PostgreSQL
pnpm db:migrate

# Run
pnpm dev                      # Backend :9999, Frontend :5173
```

## Commands

```bash
pnpm dev              # Start all
pnpm build            # Build all
pnpm typecheck        # Type check
pnpm lint             # Lint
pnpm test             # Test

pnpm db:migrate       # Apply migrations
pnpm db:generate      # Generate migration
pnpm db:studio        # Open Drizzle Studio

pnpm new:module NAME  # Scaffold new backend module
```

## Structure

```
apps/
  backend/            # Hono API
    src/
      modules/        # Feature modules (routes, handlers, use-cases)
      lib/            # Utilities
      middlewares/    # Auth, etc.
  frontend/           # React SPA
    src/
      routes/         # TanStack Router pages
      lib/            # Utilities

packages/
  db/                 # Drizzle schemas
  shared/             # Shared types
  email-templates/    # Email builders
```

## Backend Architecture

```
Route → Handler → Use-Case → Repository → Database
```

Use-cases return discriminated unions:

```typescript
type Result =
  | { type: "CREATED"; data: User }
  | { type: "EXISTS"; message: string };

// Handler switches on result.type
```

See `apps/backend/docs/ARCHITECTURE.md`.

## Adding a Module

```bash
pnpm new:module posts
```

Then register in `apps/backend/src/routes/index.ts`.

## Environment

```bash
# .env (backend)
DATABASE_URL=postgres://user:pass@localhost:5432/db
BETTER_AUTH_SECRET=<32+ chars>
BETTER_AUTH_URL=http://localhost:9999
FRONTEND_URL=http://localhost:5173

# apps/frontend/.env
VITE_API_URL=http://localhost:9999
```

## License

MIT

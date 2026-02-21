# CLAUDE.md

Quick reference for working with this codebase. Read [`AGENTS.md`](AGENTS.md) for work discipline, branching, and commit rules before starting any task.

## Docs

| Doc | What it covers |
|-----|----------------|
| `AGENTS.md` | **Work discipline, branching, commits, PRs — read first** |
| `docs/PHILOSOPHY.md` | The beliefs behind every decision — why the codebase is shaped this way |
| `CONTRIBUTING.md` | Full workflow for humans and agents |
| `docs/BATTERIES.md` | Built-in utilities (auth, jobs, caching, etc.) |
| `docs/DEPLOYMENT.md` | Production deployment guide |
| `docs/WRITING.md` | Writing voice, style guide, and influences |
| `apps/backend/docs/` | Backend architecture, patterns, decisions |
| `apps/frontend/docs/` | Frontend patterns and decisions |

## Commands

```bash
pnpm dev              # Run backend (:9999) + frontend (:5173)
pnpm test             # Run tests
pnpm lint             # Lint with Biome
pnpm typecheck        # Type check everything
pnpm db:migrate       # Apply database migrations
pnpm db:generate      # Generate migration from schema changes
pnpm new:module NAME  # Scaffold a new backend module
```

## Architecture

Backend uses clean architecture. The key rule:

**Use-cases return discriminated unions, not exceptions.**

```typescript
type Result =
  | { type: "SUCCESS"; data: T }
  | { type: "NOT_FOUND" }
  | { type: "ALREADY_EXISTS" };
```

Handlers switch on `result.type` and map to HTTP responses.

## File Locations

| What | Where |
|------|-------|
| Backend modules | `apps/backend/src/modules/{name}/` |
| Database schemas | `packages/db/src/schema/` |
| Frontend pages | `apps/frontend/src/routes/` |
| Shared types | `packages/shared/src/` |
| Backend utilities | `apps/backend/src/lib/` |

## Module Structure

```bash
modules/{name}/
  routes.ts                    # OpenAPI route definitions + exported route types
  handlers.ts                  # HTTP handlers (imperative shell)
  index.ts                     # Creates router, wires routes → handlers
  {name}.errors.ts             # Domain error type variants
  {name}.repository.ts         # Data access — tryInfra, Result, never throws
  usecases/
    {name}.usecases.ts         # Pure business logic — no DB, no async
  __tests__/
    handlers.test.ts           # Integration tests via Hono testClient
```

Generate with `pnpm new:module <name>`. The `usecases/` file is optional — add it when business rules are worth testing in isolation.

## Common Patterns

### Adding a route

1. Define in `routes.ts` with Zod schemas
2. Create handler in `handlers.ts`
3. Wire in `index.ts`
4. Register module in `apps/backend/src/routes/index.ts`

### Adding a database table

1. Create schema in `packages/db/src/schema/{table}.ts`
2. Export from `packages/db/src/schema/index.ts`
3. Run `pnpm db:generate && pnpm db:migrate`

### Using batteries

```typescript
// File uploads
import { getUploadUrl } from "@/lib/storage";

// WebSockets
import { wsManager } from "@/lib/ws";

// Rate limiting
import { rateLimit } from "@/lib/rate-limit";

// Background jobs
import { addJob } from "@/jobs";
```

## Environment

Required in `.env`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (32+ chars)

Optional:

- `REDIS_URL` — for jobs/caching
- `S3_*` — for file uploads
- `RESEND_API_KEY` — for email

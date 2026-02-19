# CLAUDE.md

Quick reference for working with this codebase.

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

```
modules/{name}/
  routes.ts         # OpenAPI route definitions
  handlers.ts       # HTTP handlers
  index.ts          # Router wiring
  {name}.repo.port.ts      # Repository interface
  {name}.repo.drizzle.ts   # Repository implementation
  usecases/
    create-{name}.usecase.ts
```

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

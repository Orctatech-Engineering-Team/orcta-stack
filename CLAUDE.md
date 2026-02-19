# CLAUDE.md

## Commands

```bash
pnpm dev          # Run all (backend:9999, frontend:5173)
pnpm build        # Build packages then apps
pnpm typecheck    # Type check all
pnpm lint         # Biome lint
pnpm test         # Vitest

pnpm db:generate  # Generate migration
pnpm db:migrate   # Apply migrations
pnpm db:studio    # Drizzle Studio
```

## Architecture

Backend uses clean architecture:

```
Route (OpenAPI/Zod) → Handler → Use-Case → Repository → Database
```

**Use-cases return discriminated unions, not exceptions:**

```typescript
type CreateResult =
  | { type: "CREATED"; data: T }
  | { type: "EXISTS"; message: string };

// Handler: switch (result.type) { ... }
```

## Module Structure

```
modules/{name}/
  routes.ts          # OpenAPI routes
  handlers.ts        # HTTP handlers
  index.ts           # Router wiring
  usecases/          # Business logic
  {name}.repo.port.ts      # Repository interface
  {name}.repo.drizzle.ts   # Repository implementation
```

## File Conventions

- `*.usecase.ts` — Business logic
- `*.repo.port.ts` — Repository interface
- `*.repo.drizzle.ts` — Drizzle implementation

## Packages

- `@repo/db` — Drizzle schemas, exports via `@repo/db/schema`
- `@repo/shared` — API types, validation schemas
- `@repo/email-templates` — Email builders

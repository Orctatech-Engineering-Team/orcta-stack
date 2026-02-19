# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## Project Overview

Orcta Stack is a modern full-stack TypeScript monorepo template. Uses pnpm workspaces with three packages (@repo/db, @repo/shared, @repo/email-templates) and two apps (backend + frontend).

## Commands

```bash
# Development
pnpm dev                  # Start all apps (backend:9999, frontend:5173)
pnpm dev:backend          # Backend only
pnpm dev:frontend         # Frontend only

# Build
pnpm build                # Full build (packages then apps)
pnpm build:packages       # Shared packages only

# Quality
pnpm typecheck            # TypeScript check all
pnpm lint                 # Lint all (Biome)
pnpm test                 # Run vitest tests

# Database
pnpm db:generate          # Generate migration after schema changes
pnpm db:migrate           # Apply migrations
pnpm db:studio            # Drizzle Studio
```

## Architecture

### Backend (Hono + Drizzle + PostgreSQL)

Follows clean architecture with discriminated unions for error handling:

```
Routes (OpenAPI + Zod validation)
    ↓
Handlers (map results to HTTP responses)
    ↓
Use-Cases (business logic, returns discriminated unions)
    ↓
Repositories (*.repo.port.ts interface, *.repo.drizzle.ts implementation)
    ↓
Database (Drizzle ORM)
```

**Critical pattern - discriminated unions for errors:**
```typescript
// Use-case returns explicit outcome types
type CreateResult =
  | { type: "CREATED"; data: User }
  | { type: "EMAIL_EXISTS"; message: string }
  | { type: "INFRASTRUCTURE_ERROR"; error: AppError };

// Handler exhaustively switches
switch (result.type) {
  case "CREATED": return c.json(success(result.data), 201);
  case "EMAIL_EXISTS": return c.json(failure(...), 409);
  case "INFRASTRUCTURE_ERROR": return c.json(failure(...), 500);
}
```

### Frontend (React 19 + Vite + TanStack Router)

- File-based routing via TanStack Router (type-safe)
- State: Zustand for UI state, React Query for server state
- UI: Radix primitives + Tailwind CSS

## Module Structure

Backend modules in `apps/backend/src/modules/{feature}/`:
- `routes.ts` - Route definitions + validation schemas
- `handlers.ts` - HTTP handlers
- `usecases/` - Business logic
- `*.repo.port.ts` - Repository interface
- `*.repo.drizzle.ts` - Repository implementation

## File Naming Conventions

- `*.repo.port.ts` = Repository interface (port)
- `*.repo.drizzle.ts` = Repository implementation (adapter)
- `*.usecase.ts` = Business logic use-case
- `handlers.ts` = HTTP handlers
- `routes.ts` = Route + validation definitions

## Tech Stack Reference

**Backend:** Hono, Drizzle ORM, PostgreSQL, better-auth, Zod, Pino logging, Biome linting

**Frontend:** React 19, Vite, TanStack Router + React Query, Zustand, React Hook Form, Radix UI, Tailwind CSS

**Shared:** @repo/db (schemas), @repo/shared (types), @repo/email-templates

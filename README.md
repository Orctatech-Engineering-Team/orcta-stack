# Orcta Stack

A modern full-stack TypeScript monorepo template with clean architecture patterns.

## Tech Stack

### Backend
- **Framework**: [Hono](https://hono.dev/) - Fast web framework
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [better-auth](https://better-auth.com/) - Modern authentication
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schemas
- **Docs**: OpenAPI with [Scalar](https://scalar.com/)
- **Logging**: Pino

### Frontend
- **Framework**: React 19
- **Router**: [TanStack Router](https://tanstack.com/router) - Type-safe routing
- **State**: [TanStack Query](https://tanstack.com/query) + [Zustand](https://zustand.docs.pmnd.rs/)
- **Forms**: React Hook Form + Zod
- **Styling**: Tailwind CSS v4
- **UI**: Radix UI primitives

### Shared Packages
- `@repo/db` - Database schemas and types
- `@repo/shared` - Shared types and validation schemas
- `@repo/email-templates` - Email templates

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL

### Installation

```bash
# Clone the template
git clone https://github.com/your-org/orcta-stack.git my-app
cd my-app

# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp apps/frontend/src/.env.example apps/frontend/src/.env

# Update DATABASE_URL and other secrets in .env
```

### Database Setup

```bash
# Generate migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio (optional)
pnpm db:studio
```

### Development

```bash
# Start all apps (backend:9999, frontend:5173)
pnpm dev

# Or start individually
pnpm dev:backend
pnpm dev:frontend
```

### Build

```bash
# Build everything
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Project Structure

```
orcta-stack/
├── apps/
│   ├── backend/              # Hono API server
│   │   ├── src/
│   │   │   ├── db/           # Database connection
│   │   │   ├── lib/          # Utilities (auth, error, types)
│   │   │   ├── middlewares/  # Auth & other middlewares
│   │   │   ├── modules/      # Feature modules
│   │   │   │   └── health/   # Example module
│   │   │   └── routes/       # Route aggregation
│   │   └── docs/             # Architecture docs
│   │
│   └── frontend/             # React SPA
│       └── src/
│           ├── components/   # UI components
│           ├── hooks/        # Custom hooks
│           ├── lib/          # Utilities (api, auth)
│           ├── routes/       # TanStack Router pages
│           └── services/     # API services
│
└── packages/
    ├── db/                   # Database schemas
    ├── shared/               # Shared types & schemas
    └── email-templates/      # Email templates
```

## Architecture

### Backend Clean Architecture

```
Routes (OpenAPI + Zod validation)
    ↓
Handlers (map results to HTTP responses)
    ↓
Use-Cases (business logic, returns discriminated unions)
    ↓
Repositories (interface + implementation)
    ↓
Database (Drizzle ORM)
```

### Discriminated Unions

Use-cases return explicit outcomes instead of throwing:

```typescript
type CreateUserResult =
  | { type: "CREATED"; user: User }
  | { type: "EMAIL_EXISTS"; message: string };

// Handler exhaustively switches
switch (result.type) {
  case "CREATED": return c.json(success(result.user), 201);
  case "EMAIL_EXISTS": return c.json(failure(...), 409);
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Type check all projects |
| `pnpm lint` | Lint all projects |
| `pnpm test` | Run tests |
| `pnpm db:generate` | Generate database migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Adding a New Module

1. Create module directory: `apps/backend/src/modules/{feature}/`
2. Define routes with OpenAPI schemas in `routes.ts`
3. Create repository interface in `{feature}.repo.port.ts`
4. Implement repository in `{feature}.repo.drizzle.ts`
5. Write use-cases with discriminated unions
6. Create handlers that map results to HTTP responses
7. Wire everything in `index.ts`
8. Register in `routes/index.ts`

See `apps/backend/docs/ARCHITECTURE.md` for details.

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=development
PORT=9999
LOG_LEVEL=debug
DATABASE_URL="postgres://user:pass@localhost:5432/db"
BETTER_AUTH_SECRET=your-32-char-secret
BETTER_AUTH_URL=http://localhost:9999
SERVER_URL=http://localhost:9999
FRONTEND_URL=http://localhost:5173
```

### Frontend (apps/frontend/src/.env)

```bash
VITE_API_URL=http://localhost:9999
```

## License

MIT

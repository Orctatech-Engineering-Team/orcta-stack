# Orcta Stack

A production-ready TypeScript monorepo. Ship fast, sleep well.

```bash
pnpm setup && docker compose up -d && pnpm db:migrate && pnpm dev
```

Backend runs on [localhost:9999](http://localhost:9999/docs). Frontend on [localhost:5173](http://localhost:5173).

---

## What's Inside

**Backend** — Hono, Drizzle, PostgreSQL, better-auth
**Frontend** — React 19, TanStack Router, Tailwind v4
**Extras** — File uploads, WebSockets, background jobs, rate limiting

---

## Get Started

This is a GitHub template. Click **Use this template** → **Create a new repository** on GitHub, then clone your new repo.

You need Node 20+ and pnpm.

```bash
git clone https://github.com/<your-org>/<your-repo> my-app
cd my-app
pnpm setup
```

`pnpm setup` installs dependencies and writes a `.env` file with a generated auth secret.

Start the database:

```bash
docker compose up -d    # Starts PostgreSQL + Redis
pnpm db:migrate         # Creates the initial tables
```

> **Note on auth tables:** Better Auth manages its own tables (users, sessions, accounts). The initial migration already includes them. If you add Better Auth plugins later (2FA, API keys, organisations, etc.), regenerate the schema first:
>
> ```bash
> npx @better-auth/cli generate   # Updates packages/db/src/schema/ from your auth config
> pnpm db:generate                # Creates the migration
> pnpm db:migrate                 # Applies it
> ```
>
> See the [Better Auth database docs](https://www.better-auth.com/docs/concepts/database) for the full reference.

Run everything:

```bash
pnpm dev
```

Open [localhost:5173](http://localhost:5173). You're live.

---

## Daily Commands

```bash
pnpm dev                # Run everything
pnpm test               # Run tests
pnpm lint               # Check code
pnpm typecheck          # Check types
```

---

## Build Something

### Add a Backend Module

```bash
pnpm new:module posts
```

This scaffolds a complete module at `apps/backend/src/modules/posts/`:

| File | Purpose |
|------|---------|
| `routes.ts` | OpenAPI route definitions with Zod schemas |
| `handlers.ts` | HTTP handlers — reads input, calls repo, maps Result to response |
| `posts.repository.ts` | Data access — uses `tryInfra`, returns `Result`, never throws |
| `posts.errors.ts` | Typed domain error variants (`PostNotFound`, etc.) |
| `usecases/` | Pure business logic — no DB, no async, fully unit-testable |
| `__tests__/` | Integration test stubs |
| `index.ts` | Wires routes to handlers, exports the router |

Register it in `apps/backend/src/routes/index.ts`:

```typescript
import posts from "@/modules/posts";

// Authenticated routes:
export const routes = [users, posts];

// Or public routes:
export const publicRoutes = [health, posts];
```

Then flesh out the repository with real Drizzle queries and add your DB schema to `packages/db/src/schema/`.

### Add a Frontend Page

Create `apps/frontend/src/routes/posts.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts")({
  component: () => <div>Posts</div>,
});
```

Done. TanStack Router handles the rest.

### Add a Database Table

Edit `packages/db/src/schema/` and run:

```bash
pnpm db:generate   # Creates migration
pnpm db:migrate    # Applies it
```

---

## Use the Batteries

### Upload Files

```typescript
import { getUploadUrl, generateKey } from "@/lib/storage";

// Generate presigned upload URL
const key = generateKey("photo.jpg", "avatars");
const url = await getUploadUrl({ key, contentType: "image/jpeg" });

// Client uploads directly to S3/R2
await fetch(url, { method: "PUT", body: file });
```

### Send Real-time Updates

```typescript
import { wsManager } from "@/lib/ws";

// Send to everyone in a room
wsManager.broadcast("notifications", { type: "new-message", data });

// Send to a specific user
wsManager.sendToUser(userId, { type: "alert", message: "Hey!" });
```

### Queue Background Work

```typescript
import { addJob } from "@/jobs";

await addJob("email", {
  to: "user@example.com",
  template: "welcome",
  data: { name: "Alex" },
});
```

Run workers: `pnpm --filter backend jobs`

### Rate Limit Routes

```typescript
import { rateLimit, authRateLimit } from "@/lib/rate-limit";

// 100 requests per minute
app.use("/api/*", rateLimit());

// 5 attempts per 5 minutes (for login)
app.post("/api/auth/login", authRateLimit, loginHandler);
```

---

## Deploy

**Backend** → Docker on any VPS, or Railway/Render
**Frontend** → Vercel (zero config)
**Database** → Supabase, Neon, or Railway

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide.

---

## Project Layout

```bash
apps/backend/src/
  modules/         ← Your features go here
  lib/             ← Reusable utilities
  jobs/            ← Background workers
  middlewares/     ← Auth, etc.

apps/frontend/src/
  routes/          ← Pages (file-based routing)
  lib/             ← API client, helpers
  components/      ← UI components

packages/
  db/              ← Database schemas
  shared/          ← Types shared everywhere
  email-templates/ ← Email builders
```

---

## Learn More

- [Architecture Guide](apps/backend/docs/ARCHITECTURE.md) — How the backend is structured
- [Backend Decisions](apps/backend/docs/DECISIONS.md) — Why each backend choice was made
- [Frontend Decisions](apps/frontend/docs/DECISIONS.md) — Why each frontend choice was made
- [Batteries Included](docs/BATTERIES.md) — All built-in utilities with usage examples
- [Deployment Guide](docs/DEPLOYMENT.md) — Ship to production
- [Writing Style Guide](docs/WRITING.md) — How we write docs and articles
- [API Docs](http://localhost:9999/docs) — Auto-generated from your code

---

## This is a Template, Not a Framework

When you create a repo from this template, you own it. There is no upstream to pull from. Delete what you don't need, rename what makes sense to rename, and diverge freely.

What to keep: the `packages/shared` Result type, the `tryInfra` pattern, the module scaffolder, the Biome config.

What to replace: the example `users` module with your own domain, the license, this README.

---

## License

Proprietary. Copyright © 2026 Orcta. All rights reserved.

This codebase is not open source. Do not distribute, sublicense, or use outside the organisation without written permission.

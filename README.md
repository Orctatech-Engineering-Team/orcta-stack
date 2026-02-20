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

You need Node 20+ and pnpm. That's it.

```bash
git clone <this-repo> my-app
cd my-app
pnpm setup
```

This installs dependencies and creates your `.env` file with a generated auth secret.

Start the database:

```bash
docker compose up -d    # Starts PostgreSQL + Redis
pnpm db:migrate         # Creates tables
```

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

This creates `apps/backend/src/modules/posts/` with routes, handlers, and a use-case template. Register it in `apps/backend/src/routes/index.ts`:

```typescript
import posts from "@/modules/posts";
export const routes = [posts];
```

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

```
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
- [Deployment Guide](docs/DEPLOYMENT.md) — Ship to production
- [API Docs](http://localhost:9999/docs) — Auto-generated from your code

---

## License

Proprietary. Copyright © 2026 Orcta. All rights reserved.

This codebase is not open source. Do not distribute, sublicense, or use outside the organisation without written permission.

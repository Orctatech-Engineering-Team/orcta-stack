<!-- trunk-ignore-all(markdownlint) -->
# Batteries

Everything opt-in beyond the basics — each section only activates once you add the relevant env vars.

**Contents**

- [Auth](#auth)
- [Pagination](#pagination)
- [Caching](#caching)
- [File Uploads](#file-uploads)
- [WebSockets](#websockets)
- [Background Jobs](#background-jobs)
- [Rate Limiting](#rate-limiting)
- [Email](#email)
- [Redis](#redis)

---

## Auth

Authentication is always on — no env var required. Powered by [better-auth](https://better-auth.com) with a Drizzle adapter.

### What's included

- Email + password sign-up / sign-in
- Session management (7-day expiry, rolling 1-day refresh)
- A `role` field on every user (default `"user"`)
- Auth routes mounted at `/api/auth/**`
- OpenAPI docs auto-generated for all auth endpoints

### Session in a handler

The `authMiddleware` (applied to all routes in the `routes` array) populates `c.get("session")`:

```typescript
import type { AppRouteHandler } from "@/lib/types";

export const myHandler: AppRouteHandler<MyRoute> = async (c) => {
  const session = c.get("session");
  const userId  = session.userId;
  const role    = session.user.role; // "user" | your custom roles
  // ...
};
```

### Extending the user model

Add fields in `apps/backend/src/lib/auth.ts` under `user.additionalFields`, then add the
matching column to `packages/db/src/schema/users.ts` and run a migration.

### Frontend client

```typescript
// apps/frontend/src/lib/auth-client.ts (already wired)
import { authClient, signInWithProvider } from "@/lib/auth-client";

await authClient.signUp.email({ email, password, name });
await authClient.signIn.email({ email, password });
await authClient.signOut();
const session = await authClient.getSession();

// Social sign-in — redirects to provider, then returns to callbackURL
await signInWithProvider("google", "/dashboard");
await signInWithProvider("github", "/dashboard");
```

### Social OAuth (Google + GitHub)

**Requires env vars:** at least one of `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` or `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`

Providers are activated only when both their vars are present — leaving vars blank will
not break the app, the button just will not appear. No DB migration needed (the existing
`accounts` table already handles OAuth tokens).

Add to `.env`:

```bash
# Google — https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# GitHub — https://github.com/settings/developers
GITHUB_CLIENT_ID=Iv1.xxx
GITHUB_CLIENT_SECRET=xxx
```

Set the **Authorized redirect URI** in each provider console to:

```
http://localhost:9999/api/auth/callback/google
http://localhost:9999/api/auth/callback/github
```

(replace with your production URL in production apps)

---

## File Uploads

Upload files directly to S3 or Cloudflare R2 using presigned URLs. Files never touch the server.

**Requires env vars:** `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

### Setup

Add to `.env`:

```bash
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com  # omit for AWS S3
S3_BUCKET=uploads
S3_REGION=auto
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

Works with AWS S3, Cloudflare R2, MinIO, or any S3-compatible store.

### API

```typescript
import { generateKey, getUploadUrl, getDownloadUrl, deleteFile } from "@/lib/storage";

// 1. Generate a collision-free key
const key = generateKey("photo.jpg", "avatars");
// → "avatars/550e8400-e29b-41d4-a716-446655440000.jpg"

// 2. Presigned upload URL (default: 1 hour)
const uploadUrl = await getUploadUrl({
  key,
  contentType: "image/jpeg",
  expiresIn: 3600,
});

// 3. Presigned download URL (default: 1 hour)
const downloadUrl = await getDownloadUrl({ key });

// 4. Delete
await deleteFile(key);
```

### Wiring it up: presign endpoint

Create a route that returns a presigned URL to the client:

```typescript
// In your module's handler:
export const presignHandler: AppRouteHandler<PresignRoute> = async (c) => {
  const { filename, contentType } = c.req.valid("json");
  const key = generateKey(filename);
  const uploadUrl = await getUploadUrl({ key, contentType });
  return c.json(success({ uploadUrl, key }), OK);
};
```

### Frontend upload

```typescript
async function uploadFile(file: File, presignUrl: string) {
  // 1. Ask your API for a presigned URL
  const { uploadUrl, key } = await api.post(presignUrl, {
    filename: file.name,
    contentType: file.type,
  });

  // 2. PUT directly to S3/R2 — your server is never in the data path
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  return key; // store this in your DB
}
```

---

## WebSockets

Real-time communication with room support.

**Already active** — no extra env vars. WebSocket connections go to `/ws`.

### Server usage

```typescript
import { upgradeWebSocket } from "hono/ws";
import { wsManager } from "@/lib/ws";

app.get("/ws", upgradeWebSocket((c) => {
  // capture the id in the closure so all callbacks share it
  let connectionId: string;

  return {
    onOpen(_event, ws) {
      connectionId = crypto.randomUUID();
      wsManager.add(connectionId, ws, c.get("session")?.userId);
      wsManager.join(connectionId, "global");
    },

    onMessage(event, _ws) {
      const data = JSON.parse(String(event.data));
      // handle incoming messages
    },

    onClose() {
      wsManager.remove(connectionId);
    },
  };
}));
```

### WebSocketManager API

| Method | Description |
|--------|-------------|
| `add(id, ws, userId?)` | Register a new connection |
| `remove(id)` | Remove a connection |
| `get(id)` | Get a connection by id |
| `join(id, room)` | Add a connection to a room |
| `leave(id, room)` | Remove a connection from a room |
| `send(id, data)` | Send to one connection |
| `broadcast(room, data, excludeId?)` | Send to all connections in a room |
| `sendToUser(userId, data)` | Send to all connections belonging to a user |
| `broadcastAll(data, excludeId?)` | Send to every connected client |
| `size` | Number of active connections |

### Client usage

```typescript
const ws = new WebSocket("wss://api.example.com/ws");

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg);
};

ws.send(JSON.stringify({ type: "join", room: "chat-123" }));
```

> **Production note** — `wsManager` is in-process. If you run multiple server instances, connections are not shared across them. Add a Redis pub/sub layer if you need cross-instance broadcasting.

---

## Background Jobs

Process work asynchronously with [BullMQ](https://docs.bullmq.io).

**Requires env var:** `REDIS_URL`

### Setup

```bash
REDIS_URL=redis://localhost:6379
```

### Job types

Defined in `apps/backend/src/jobs/index.ts`:

```typescript
export type JobName = "email" | "cleanup" | "sync";

export interface JobData {
  email:   { to: string; template: string; data: Record<string, unknown> };
  cleanup: { olderThanDays: number };
  sync:    { userId: string };
}
```

### Queue a job

```typescript
import { addJob } from "@/jobs";

// Fire and forget
await addJob("email", {
  to: "user@example.com",
  template: "welcome",
  data: { name: "Alex" },
});

// With options
await addJob("cleanup", { olderThanDays: 30 }, {
  delay: 60_000,   // wait 1 min before processing
  priority: 10,    // higher = processed first
});
```

Jobs are automatically kept for the last 100 successes and 1 000 failures in Redis.

### Process jobs

Add your logic in `apps/backend/src/jobs/worker.ts` inside the `processors` object:

```typescript
const processors = {
  async email(job) {
    const { to, template, data } = job.data;
    await sendEmail(to, template, data); // wire up your email sender
  },

  async sync(job) {
    const { userId } = job.data;
    // fetch external data, update DB, etc.
  },

  async cleanup(job) {
    const { olderThanDays } = job.data;
    // delete old records
  },
};
```

Each worker runs with **concurrency 5** and handles graceful shutdown on `SIGTERM`/`SIGINT`.

### Run workers

```bash
pnpm --filter backend jobs
```

In production, run this as a separate process or container alongside the HTTP server.

### Adding a new job type

1. Add the name to the `JobName` union and its payload to `JobData` in `jobs/index.ts`
2. Create a queue getter following the existing pattern (`getSyncQueue` etc.)
3. Add the queue to the `queueMap` inside `addJob`
4. Add a processor in `worker.ts`
5. Add the job name to the workers array: `(["email", "cleanup", "sync", "yourJob"] as JobName[])`

---

## Rate Limiting

Protect your API from abuse. **Always active** — no setup required.

### Basic usage

```typescript
import { rateLimit } from "@/lib/rate-limit";

// 100 req/min per IP on all routes
app.use("/api/*", rateLimit());

// Custom window
app.use("/api/search", rateLimit({
  windowMs: 60_000,  // 1 minute
  max: 20,
}));
```

### Presets

```typescript
import { authRateLimit, strictRateLimit } from "@/lib/rate-limit";

app.post("/api/auth/*", authRateLimit);   // 5 req / 5 min  — for login / sign-up
app.post("/api/export", strictRateLimit); // 10 req / min   — for expensive operations
```

### Rate limit by user

```typescript
app.use("/api/*", rateLimit({
  keyGenerator: (c) => c.get("session")?.userId
    ?? c.req.header("x-forwarded-for")
    ?? "anon",
}));
```

### Response headers

Every rate-limited response includes:

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Max requests allowed in the window |
| `X-RateLimit-Remaining` | Requests left this window |
| `Retry-After` | Seconds until reset (only on 429) |

> **Production note** — the store is in-memory and resets on restart. It is not shared across multiple server instances. For multi-instance deployments, replace the store with a Redis-backed implementation (e.g. `rate-limit-redis`).

---

## Email

Send transactional emails with [Resend](https://resend.com).

**Requires env var:** `RESEND_API_KEY`

### Setup

```bash
RESEND_API_KEY=re_xxxxx
```

### Usage

```typescript
import { Resend } from "resend";
import { welcomeEmail, passwordResetEmail } from "@repo/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

// Welcome email
const welcome = welcomeEmail({ name: "Alex", actionUrl: "https://app.example.com/verify?token=xxx" });

await resend.emails.send({
  from: "hello@yourdomain.com",
  to: "alex@example.com",
  subject: welcome.subject,
  html: welcome.html,
  text: welcome.text,
});

// Password reset
const reset = passwordResetEmail({ name: "Alex", actionUrl: "https://app.example.com/reset?token=xxx" });

await resend.emails.send({
  from: "hello@yourdomain.com",
  to: "alex@example.com",
  subject: reset.subject,
  html: reset.html,
  text: reset.text,
});
```

### Available templates

| Function | Subject |
|----------|---------|
| `welcomeEmail({ name, actionUrl? })` | `Welcome, {name}!` |
| `passwordResetEmail({ name, actionUrl })` | `Reset your password` |

### Adding templates

Edit `packages/email-templates/src/index.ts`:

```typescript
export function invoiceEmail({ amount, dueDate }: { amount: number; dueDate: string }): EmailTemplate {
  return {
    subject: `Invoice for $${amount}`,
    html: baseTemplate("Invoice", `<p>Amount due: $${amount}</p><p>Due by: ${dueDate}</p>`),
    text: `Invoice\n\nAmount due: $${amount}\nDue by: ${dueDate}`,
  };
}
```

`baseTemplate(title, body)` handles the outer HTML shell and sign-off. All templates export `{ subject, html, text }`.

---

## Redis

A shared `ioredis` client is available for caching, pub/sub, or anything else that needs Redis.

**Requires env var:** `REDIS_URL`

### Usage

```typescript
import { redis, getRedis } from "@/lib/redis";

// redis is null if REDIS_URL is not set — safe to import unconditionally
if (redis) {
  await redis.set("key", "value", "EX", 60); // TTL 60 s
  const value = await redis.get("key");
}

// getRedis() throws if REDIS_URL is missing — use inside code that requires Redis
const client = getRedis();
await client.publish("channel", JSON.stringify({ event: "update" }));
```

The same client instance is reused by BullMQ — no second connection is opened.

---

## Pagination

Pagination utilities live in `@repo/shared` — no infrastructure required.

### API

```typescript
import {
  paginationSchema,
  paginationQuery,
  paginatedSuccessSchema,
  paginate,
} from "@repo/shared";
```

### Route definition

```typescript
import { paginationSchema, paginatedSuccessSchema } from "@repo/shared";
import { apiErrorSchema } from "@repo/shared";

export const listPosts = createRoute({
  method: "get",
  path: "/posts",
  tags,
  request: {
    query: paginationSchema,  // parses ?page=1&limit=20 with defaults
  },
  responses: {
    [OK]: jsonRes(paginatedSuccessSchema(selectPostSchema), "Paginated posts"),
    [INTERNAL_SERVER_ERROR]: e500,
  },
});
```

### Handler

```typescript
import { paginate, paginationQuery } from "@repo/shared";
import { count } from "drizzle-orm";

export const listPostsHandler: AppRouteHandler<ListPostsRoute> = async (c) => {
  const input = c.req.valid("query");
  const { limit, offset } = paginationQuery(input);

  const [rows, [{ total }]] = await Promise.all([
    db.query.posts.findMany({ limit, offset, orderBy: desc(posts.createdAt) }),
    db.select({ total: count() }).from(posts),
  ]);

  return c.json(success(paginate(rows, total, input)), OK);
};
```

### Response shape

```json
{
  "success": true,
  "data": {
    "items": [...],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 84,
      "totalPages": 5,
      "hasMore": true
    }
  }
}
```

---

## Caching

A thin read-through cache over the existing Redis client.

**Requires env var:** `REDIS_URL` — degrades gracefully to a direct function call when Redis is absent.

### API

```typescript
import { withCache, invalidateCache, cacheKey } from "@/lib/cache";
```

### Read-through cache

```typescript
// In a repository:
export async function findUserById(id: string) {
  return withCache(
    cacheKey("user", id),  // → "user:abc123"
    300,                    // TTL: 5 minutes
    () => db.query.users.findFirst({ where: eq(users.id, id) }),
  );
}
```

### Cache invalidation

```typescript
// After a write, invalidate the cached entry:
await updateUser(id, data);
await invalidateCache(cacheKey("user", id));

// Invalidate multiple keys at once:
await invalidateCache(
  cacheKey("post", postId),
  cacheKey("posts", "list"),
);
```

### Behaviour

| Scenario | Result |
|----------|--------|
| Redis available, key exists | Returns cached value (no DB call) |
| Redis available, cache miss | Calls `fn`, stores result, returns value |
| Redis down or absent | Calls `fn` directly — request never fails |
| Cache write fails | Swallowed — the value is still returned |

# Backend Patterns

Recipes for common tasks.

---

## Creating a Complete Module

Full example: a `posts` module.

### 1. Define the Schema

`packages/db/src/schema/posts.ts`:

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const posts = pgTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts);
export const selectPostSchema = createSelectSchema(posts);

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
```

Export from `packages/db/src/schema/index.ts`:

```typescript
export * from "./posts";
```

### 2. Define Domain Errors

`apps/backend/src/modules/posts/posts.errors.ts`:

```typescript
// Expected, business-rule failures — not bugs.
// Each variant carries exactly the data a handler needs.
export type PostNotFound = { type: "POST_NOT_FOUND"; lookup: string };
export type NotPostAuthor = { type: "NOT_POST_AUTHOR"; userId: string; postId: string };

export type PostRepoError = PostNotFound | NotPostAuthor;
```

### 3. Write the Repository

`apps/backend/src/modules/posts/posts.repository.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@repo/db/schema";
import { ok, err } from "@repo/shared";
import type { Result } from "@repo/shared";
import { InfrastructureError } from "@/lib/error";
import { tryInfra } from "@/lib/infra";
import type { Post, InsertPost } from "@repo/db/schema";
import type { PostNotFound } from "./posts.errors";

export async function findPostById(
  id: string,
): Promise<Result<Post, PostNotFound | InfrastructureError>> {
  const result = await tryInfra(`fetch post ${id}`, () =>
    db.query.posts.findFirst({ where: eq(posts.id, id) }),
  );
  if (!result.ok) return result;
  if (!result.value) return err({ type: "POST_NOT_FOUND", lookup: id });
  return ok(result.value);
}

export async function createPost(
  data: InsertPost,
): Promise<Result<Post, InfrastructureError>> {
  const result = await tryInfra("create post", () =>
    db.insert(posts).values(data).returning().then((rows) => rows[0]),
  );
  if (!result.ok) return result;
  if (!result.value) return err(new InfrastructureError("Insert returned no rows"));
  return ok(result.value);
}

export async function updatePost(
  id: string,
  data: Partial<InsertPost>,
): Promise<Result<Post, PostNotFound | InfrastructureError>> {
  const result = await tryInfra(`update post ${id}`, () =>
    db.update(posts).set(data).where(eq(posts.id, id)).returning().then((rows) => rows[0]),
  );
  if (!result.ok) return result;
  if (!result.value) return err({ type: "POST_NOT_FOUND", lookup: id });
  return ok(result.value);
}

export async function deletePost(
  id: string,
): Promise<Result<void, PostNotFound | InfrastructureError>> {
  const result = await tryInfra(`delete post ${id}`, () =>
    db.delete(posts).where(eq(posts.id, id)).returning().then((rows) => rows[0]),
  );
  if (!result.ok) return result;
  if (!result.value) return err({ type: "POST_NOT_FOUND", lookup: id });
  return ok(undefined);
}
```

### 4. Define Routes

`apps/backend/src/modules/posts/routes.ts`:

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import { selectPostSchema } from "@repo/db/schema";
import { apiSuccessSchema, apiErrorSchema } from "@repo/shared";
import {
  jsonRes,
  jsonBody,
  OK,
  CREATED,
  UNAUTHORIZED,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
} from "@/lib/types";

const tags = ["Posts"];

// Shared error responses — define once, reuse across routes in this module
const e401 = jsonRes(apiErrorSchema, "Unauthorized");
const e500 = jsonRes(apiErrorSchema, "Internal server error");

export const createPost = createRoute({
  method: "post",
  path: "/posts",
  tags,
  request: {
    body: jsonBody(z.object({ title: z.string().min(3), content: z.string().min(1) })),
  },
  responses: {
    [CREATED]: jsonRes(apiSuccessSchema(selectPostSchema), "Created"),
    [UNAUTHORIZED]: e401,
    [INTERNAL_SERVER_ERROR]: e500,
  },
});

export const getPost = createRoute({
  method: "get",
  path: "/posts/{id}",
  tags,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    [OK]: jsonRes(apiSuccessSchema(selectPostSchema), "Found"),
    [UNAUTHORIZED]: e401,
    [NOT_FOUND]: jsonRes(apiErrorSchema, "Not found"),
    [INTERNAL_SERVER_ERROR]: e500,
  },
});

export type CreatePostRoute = typeof createPost;
export type GetPostRoute = typeof getPost;
```

> **Every status code your handler returns must be declared in `responses`.** `AppRouteHandler` is type-safe against the route definition — returning an undeclared status (including 500) is a compile error. Always declare 500 if the handler calls a repository.

### 5. Write Use-Cases (when needed)

Add `posts.usecases.ts` only when business logic exists. These are **pure functions** — no DB imports, no async, no HTTP.

`apps/backend/src/modules/posts/posts.usecases.ts`:

```typescript
import type { User, Post } from "@repo/db/schema";
import type { NotPostAuthor } from "./posts.errors";
import { ok, err, type Result } from "@repo/shared";

// Pure rule: can this user modify this post?
export function authorizePostUpdate(
  user: { id: string },
  post: Post,
): Result<Post, NotPostAuthor> {
  if (post.authorId !== user.id)
    return err({ type: "NOT_POST_AUTHOR", userId: user.id, postId: post.id });
  return ok(post);
}
```

For simple CRUD with no rules, skip this file entirely.

---

### 6. Write Handlers

`apps/backend/src/modules/posts/handlers.ts`:

```typescript
import type { AppRouteHandler } from "@/lib/types";
import { success, failure, isInfraError, OK, CREATED, NOT_FOUND, INTERNAL_SERVER_ERROR } from "@/lib/types";
import { match } from "@repo/shared";
import type { CreatePostRoute, GetPostRoute } from "./routes";
import { createPost, findPostById } from "./posts.repository";

export const createPostHandler: AppRouteHandler<CreatePostRoute> = async (c) => {
  const userId = c.get("user").id;
  const body = c.req.valid("json");

  const result = await createPost({ authorId: userId, ...body });

  if (!result.ok)
    return c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR);

  return c.json(success(result.value), CREATED);
};

export const getPostHandler: AppRouteHandler<GetPostRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const result = await findPostById(id);

  // match on ok/err, then switch on domain variants inside err
  return match(result, {
    ok: (post) => c.json(success(post), OK),
    err: (e) => {
      if (isInfraError(e))
        return c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR);
      switch (e.type) {
        case "POST_NOT_FOUND":
          return c.json(failure({ code: "NOT_FOUND", message: "Post not found" }), NOT_FOUND);
      }
    },
  });
};
```

### 7. Wire It Up

`apps/backend/src/modules/posts/index.ts`:

```typescript
import { createRouter } from "@/lib/create-app";
import * as routes from "./routes";
import * as handlers from "./handlers";

const router = createRouter()
  .openapi(routes.createPost, handlers.createPostHandler)
  .openapi(routes.getPost, handlers.getPostHandler);

export default router;
```

Register in `apps/backend/src/routes/index.ts`:

```typescript
import posts from "@/modules/posts";

// publicRoutes are mounted before authMiddleware (e.g. health check)
export const publicRoutes = [health];
// routes are mounted under /api/* and protected by authMiddleware
export const routes = [posts];
```

---

## Authentication Patterns

### Protecting Routes

```typescript
// In app.ts — protect all /api/* routes
import { authMiddleware } from "@/middlewares/auth";

app.use("/api/*", authMiddleware);
```

### Accessing User in Handlers

```typescript
export const handler: AppRouteHandler<Route> = async (c) => {
  const user = c.get("user");      // { id, email, name, role }
  const session = c.get("session"); // { id, userId, expiresAt }
};
```

### Role-Based Access

```typescript
import { requireRole } from "@/middlewares/auth";

// Per-router
const router = createRouter()
  .use(requireRole("admin"))
  .openapi(routes.adminOnly, handlers.adminOnlyHandler);

// Or per-path in app.ts
app.use("/api/admin/*", requireRole("admin"));
```

### Ownership Checks

Put ownership rules in a use-case — pure function, no DB. The handler loads the data (imperative shell) and delegates the rule (functional core):

```typescript
// posts.usecases.ts
export function authorizePostUpdate(
  user: { id: string },
  post: Post,
): Result<Post, NotPostAuthor> {
  if (post.authorId !== user.id)
    return err({ type: "NOT_POST_AUTHOR", userId: user.id, postId: post.id });
  return ok(post);
}

// handlers.ts
export const updatePostHandler: AppRouteHandler<UpdatePostRoute> = async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const found = await findPostById(id);
  if (!found.ok)
    return isInfraError(found.error)
      ? c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR)
      : c.json(failure({ code: "NOT_FOUND", message: "Post not found" }), NOT_FOUND);

  const authorized = authorizePostUpdate(user, found.value);
  if (!authorized.ok)
    return c.json(failure({ code: "FORBIDDEN", message: "Not your post" }), FORBIDDEN);

  const result = await updatePost(id, body);
  return match(result, {
    ok: (post) => c.json(success(post), OK),
    err: (e) => {
      if (isInfraError(e))
        return c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR);
      switch (e.type) {
        case "POST_NOT_FOUND":
          return c.json(failure({ code: "NOT_FOUND", message: "Post not found" }), NOT_FOUND);
      }
    },
  });
};
```

---

## Result Helpers

```typescript
import { ok, err, map, andThen, andThenAsync, match } from "@repo/shared";
```

### `match` — handle both branches in a handler

`match` handles the ok/err split. When the error union has multiple variants, use `switch` inside the `err` branch — TypeScript will tell you if you miss one:

```typescript
const result = await findPostById(id);
return match(result, {
  ok: (post) => c.json(success(post), OK),
  err: (e) => {
    if (isInfraError(e))
      return c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR);
    switch (e.type) {
      case "POST_NOT_FOUND":
        return c.json(failure({ code: "NOT_FOUND", message: "Post not found" }), NOT_FOUND);
      case "NOT_POST_AUTHOR":
        return c.json(failure({ code: "FORBIDDEN", message: "Not your post" }), FORBIDDEN);
    }
  },
});
```

The ternary shorthand is only appropriate when there is exactly one domain error variant.

### `andThenAsync` — chain two async repository calls

```typescript
// Equivalent to: fetch user, then if ok, create post
const result = await andThenAsync(
  await findUserById(userId),
  (user) => createPost({ authorId: user.id, ...body }),
);
```

Compare with the explicit form — use whichever reads more clearly:

```typescript
const userResult = await findUserById(userId);
if (!userResult.ok) return userResult;
const postResult = await createPost({ authorId: userResult.value.id, ...body });
```

### `map` — transform the value, pass error through

```typescript
// Pluck just the ID from a successful fetch
const idResult = map(await findPostById(id), (post) => post.id);
```

---

## Pagination Pattern

### Repository

```typescript
export async function listPosts(options: {
  limit: number;
  offset: number;
}): Promise<Result<{ data: Post[]; total: number }, InfrastructureError>> {
  const result = await tryInfra("list posts", () =>
    Promise.all([
      db.query.posts.findMany({
        limit: options.limit,
        offset: options.offset,
        orderBy: (p, { desc }) => desc(p.createdAt),
      }),
      db.select({ count: sql<number>`count(*)` }).from(posts).then((r) => Number(r[0].count)),
    ]),
  );
  if (!result.ok) return result;
  const [data, total] = result.value;
  return ok({ data, total });
}
```

### Handler

```typescript
export const listPostsHandler: AppRouteHandler<ListPostsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const result = await listPosts({ limit, offset });
  if (!result.ok)
    return c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR);

  const { data, total } = result.value;
  return c.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, OK);
};
```

---

## Testing

Three tiers. No mocks unless there is genuinely no alternative.

### 1. Unit Testing Use-Cases

Use-cases are pure functions — no DB, no HTTP, no mocks needed. Just call them with plain values.

File: `modules/posts/__tests__/posts.usecases.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { authorizePostUpdate } from "../posts.usecases";

describe("authorizePostUpdate", () => {
  const post = { id: "p1", authorId: "u1", title: "hi", content: "...", createdAt: new Date(), updatedAt: new Date() };

  it("returns ok when user owns the post", () => {
    const result = authorizePostUpdate({ id: "u1" }, post);
    expect(result).toEqual({ ok: true, value: post });
  });

  it("returns NOT_POST_AUTHOR when user does not own the post", () => {
    const result = authorizePostUpdate({ id: "u2" }, post);
    expect(result).toEqual({ ok: false, error: { type: "NOT_POST_AUTHOR", userId: "u2", postId: "p1" } });
  });
});
```

Every business rule lives in a use-case. Every use-case is testable this way.

### 2. Integration Testing Repositories

Repositories talk directly to the DB — test them against a real test database, not mocks. Run a local Postgres instance (or Docker) configured via `.env.test`.

File: `modules/posts/__tests__/posts.repository.test.ts`

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { createPost, findPostById } from "../posts.repository";
import { db } from "@/db";
import { schema } from "@/db";

afterEach(async () => {
  // Delete in FK-safe order. posts.authorId → users, so delete posts first
  // if users are seeded, or just delete the leaf table when testing in isolation.
  await db.delete(schema.posts);
});

describe("findPostById", () => {
  it("returns POST_NOT_FOUND when no row exists", async () => {
    const result = await findPostById("nonexistent");
    expect(result).toEqual({ ok: false, error: { type: "POST_NOT_FOUND", lookup: "nonexistent" } });
  });

  it("returns the post when it exists", async () => {
    const created = await createPost({ authorId: "u1", title: "hello", content: "world" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const found = await findPostById(created.value.id);
    expect(found).toEqual({ ok: true, value: created.value });
  });
});
```

This tests the actual SQL queries, actual constraint errors, and actual `tryInfra` boundary behaviour.

### 3. Integration Testing Handlers

Test full HTTP flows against a real DB using `app.request()`. Auth is handled by signing up through the app — no mocks, no fake sessions.

File: `modules/posts/__tests__/handlers.test.ts`

```typescript
import { describe, it, expect, afterEach } from "vitest";
import app from "@/app";
import { db } from "@/db";
import { schema } from "@/db";

// Sign up via the app + extract the session cookie (autoSignIn: true)
async function signUp(email = "test@example.com", password = "password-123") {
  const res = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "Test" }),
  });
  return res.headers.get("set-cookie") ?? "";
}

afterEach(async () => {
  await db.delete(schema.verifications); // no FK cascade
  await db.delete(schema.users);         // cascades sessions + accounts
});

describe("GET /api/posts/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await app.request("/api/posts/nonexistent");
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown post", async () => {
    const cookie = await signUp();
    const res = await app.request("/api/posts/nonexistent", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with the post when it exists", async () => {
    const cookie = await signUp();
    // Seed directly via DB for speed, not through the API
    const [post] = await db.insert(schema.posts)
      .values({ title: "hello", content: "world", authorId: "u1" })
      .returning();
    const res = await app.request(`/api/posts/${post.id}`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    // biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(post.id);
  });
});
```

### When Mocks Are Acceptable

Only when the real thing cannot run in a test environment:
- External email/SMS providers (mock the transport, not the business logic)
- Third-party payment APIs (Stripe, etc.)
- External webhooks or OAuth flows

Do **not** mock the DB, Redis, or any infrastructure you can run locally.

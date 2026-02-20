# Backend Architecture

Simple rules, predictable code.

---

## The Flow

```
Request → Route → Handler → [Use-Case →] Repository → Database
```

**Route** — Validates input with Zod, defines OpenAPI spec  
**Handler** — Imperative shell. Calls use-case or repository, maps `Result` to HTTP  
**Use-Case** — Functional core. Pure business logic. No HTTP, no direct DB calls.  
**Repository** — Imperative shell. Data access via `tryInfra`. Never throws. Returns `Result<T, E>`.

The use-case layer is **optional per route**, not optional per module. Use it when business logic exists. Skip it when a handler is just calling a repository.

---

## Functional Core / Imperative Shell

The architecture enforces this boundary at the type level.

**Imperative shell** (handlers, repositories) — talks to the outside world:
- Receives HTTP requests, persists data, calls external services
- Produces `Result` values from messy reality

**Functional core** (use-cases) — pure functions over domain values:
- Receives already-loaded data as arguments
- Applies business rules
- Returns `Result` — no side effects, no async DB calls
- Trivially testable: call with plain values, assert on the returned `Result` — no mocks, no DB

```
┌──────────────────────────────────────────────┐
│               Imperative Shell               │
│                                              │
│  Route → Handler → Repository → DB/Redis/... │
│               │                              │
│               ▼                              │
│     ┌─────────────────────────┐              │
│     │     Functional Core     │              │
│     │  Use-Case (pure Result) │              │
│     └─────────────────────────┘              │
└──────────────────────────────────────────────┘
```

---

## The One Rule

**Never throw. Encode all failures in the return type.**

| Category | Type | Produced by | Handled by |
|---|---|---|---|
| Domain | Typed discriminated union | Repository functions | Handlers — switch/match exhaustively |
| Infrastructure | `InfrastructureError` | `tryInfra()` | Handlers — `isInfraError()` guard → 500 |

```typescript
// ❌ Don't — hidden control flow, nothing typed at the call site
async function getPost(id: string): Promise<Post> {
  const post = await db.query.posts.findFirst({ where: eq(posts.id, id) });
  if (!post) throw new Error("Not found");
  return post;
}

// ✅ Do — every outcome is explicit and typed
async function findPostById(
  id: string,
): Promise<Result<Post, PostNotFound | InfrastructureError>> {
  const result = await tryInfra("find post by id", () =>
    db.query.posts.findFirst({ where: eq(posts.id, id) }),
  );
  if (!result.ok) return result;
  if (!result.value) return err({ type: "POST_NOT_FOUND", lookup: id });
  return ok(result.value);
}
```

---

## When to Add a Use-Case

**Skip it** when the handler is a thin wrapper around one repository call:

```typescript
// No use-case needed — handler calls repo directly
export const getPostHandler: AppRouteHandler<GetPostRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const result = await findPostById(id);
  return match(result, {
    ok: (post) => c.json(success(post), OK),
    err: (e) =>
      isInfraError(e)
        ? c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR)
        : c.json(failure({ code: "NOT_FOUND", message: "Post not found" }), NOT_FOUND),
  });
};
```

**Add it** when any of these are true:
- Logic spans multiple repository results
- A rule can be expressed as a pure function over domain values
- The logic is worth testing in isolation, without touching the DB

```typescript
// posts.usecases.ts — pure functions, no imports from @/db
import type { User, Post } from "@repo/db";
import type { NotPostAuthor } from "./posts.errors";
import { ok, err, type Result } from "@repo/shared";

export function authorizePostUpdate(
  user: User,
  post: Post,
): Result<Post, NotPostAuthor> {
  if (post.authorId !== user.id)
    return err({ type: "NOT_POST_AUTHOR", userId: user.id, postId: post.id });
  return ok(post);
}
```

```typescript
// posts/handlers.ts — handler runs the imperative shell, calls use-case for the rule
export const updatePostHandler: AppRouteHandler<UpdatePostRoute> = async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const found = await findPostById(id);
  if (!found.ok)
    return c.json(failure({ code: "NOT_FOUND", message: "Post not found" }), NOT_FOUND);

  const authorized = authorizePostUpdate(user, found.value);
  if (!authorized.ok)
    return c.json(failure({ code: "FORBIDDEN", message: "Not your post" }), FORBIDDEN);

  const result = await updatePost(id, body);
  return match(result, {
    ok: (post) => c.json(success(post), OK),
    err: () => c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR),
  });
};
```

Use-cases receive already-loaded data as arguments — they never import from `@/db` or call repository functions. The handler is the orchestrator: it calls the repositories (imperative shell), then passes the results into the use-case (functional core). Because use-cases are pure functions, they require no mocking to test: call them with plain values and assert on the `Result`.

---

## Result Helpers

```typescript
import { ok, err, map, andThen, andThenAsync, match, isOk, isErr } from "@repo/shared";
```

| Helper | Use when |
|---|---|
| `map(result, fn)` | Transform the value, pass error through unchanged |
| `andThen(result, fn)` | Chain a sync Result-returning function |
| `andThenAsync(result, fn)` | Chain an async Result-returning function |
| `match(result, { ok, err })` | Handle both branches exhaustively — primary handler pattern |

The `if (!result.ok) return result` pattern is still fine inside repositories when you need to inspect intermediate values. Use helpers when they reduce noise, not to be clever.

```typescript
// match in a handler — both branches handled, compiler enforces exhaustiveness
return match(result, {
  ok: (user) => c.json(success(user), OK),
  err: (e) =>
    isInfraError(e)
      ? c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR)
      : c.json(failure({ code: "NOT_FOUND", message: "User not found" }), NOT_FOUND),
});

// andThenAsync — chain two async repo calls, short-circuits on first error
const result = await andThenAsync(
  await findUserById(userId),
  (user) => createPost(user, body),
);
```

---

## Error Hierarchy

```
InfrastructureError     → DB, Redis, storage, network failures
                          Produced by: tryInfra() in repositories
                          Handled by: handlers → 500
                          If it reaches onError: that's a bug

Domain error variant    → Expected business-rule failure
                          e.g. UserNotFound, EmailTaken, NotPostAuthor
                          Produced by: repository and use-case functions
                          Handled by: handlers, switch/match exhaustively
                          Never escapes
```

---

## File Structure

```
modules/posts/
  posts.errors.ts       ← domain error type variants for this module
  posts.repository.ts   ← data access — uses tryInfra, never catches
  posts.usecases.ts     ← pure business logic (add when needed)
  routes.ts             ← OpenAPI route definitions
  handlers.ts           ← maps Result branches to HTTP responses
  index.ts              ← registers routes
  __tests__/
    posts.usecases.test.ts   ← pure unit tests (no DB)
    posts.repository.test.ts ← integration tests (real DB)
    handlers.test.ts         ← HTTP integration tests (full stack)
```

Test files live in `__tests__/` alongside the module they test, not in a top-level `tests/` directory. The vitest config uses `src/**/*.test.ts` to pick them up automatically.

---

## Key Primitives

| Import | From | Purpose |
|---|---|---|
| `Result`, `ok`, `err`, `map`, `andThen`, `andThenAsync`, `match`, `isOk`, `isErr` | `@repo/shared` | Result type and combinators |
| `apiSuccessSchema(dataSchema)` | `@repo/shared` | Canonical `{ success: true, data }` Zod schema for route responses |
| `apiErrorSchema` | `@repo/shared` | Canonical `{ success: false, error }` Zod schema for route responses |
| `tryInfra` | `@/lib/infra` | Single catch boundary for all repositories |
| `InfrastructureError` | `@/lib/error` | Wraps unknown infrastructure throws |
| `isInfraError` | `@/lib/types` | Type guard for handlers |
| `success`, `failure` | `@/lib/types` | HTTP response shape helpers |
| `jsonRes(schema, description)` | `@/lib/types` | Collapse `{ content: { "application/json": { schema } }, description }` in route definitions |
| `jsonBody(schema)` | `@/lib/types` | Collapse `{ content: { "application/json": { schema } } }` for request bodies |
| `OK`, `CREATED`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`, … | `@/lib/types` | Named HTTP status constants — re-exported from `src/lib/http-status-codes.ts` |
| `AppRouteHandler` | `@/lib/types` | Type-safe handler type |
| `WideEvent` | `@/lib/types` | Type for the per-request canonical log event |
| `addToEvent(c, fields)` | `@/lib/types` | Merge business context into the in-flight wide event |
| `authMiddleware` | `@/middlewares/auth` | Auth middleware (plain function, not factory) |
| `requireRole` | `@/middlewares/auth` | Role guard (factory — takes role strings) |
| `wideEventMiddleware` | `@/middlewares/wide-event` | Canonical log line accumulator — emits one wide event per request |

---

## Observability

This codebase uses the **wide event / canonical log line** pattern from [loggingsucks.com](https://loggingsucks.com).

Instead of emitting many small log statements throughout a request, a single rich event is built up over the request lifecycle and emitted once at the end with everything needed to answer any debugging question.

```
Request arrives
   │
   ▼
wideEventMiddleware      ← initialises event: request_id, method, path, service, region
   │
   ▼
authMiddleware           ← addToEvent: user.id, user.role
   │
   ▼
business handler         ← addToEvent: domain-specific fields (order, payment, etc.)
   │
   ▼
wideEventMiddleware      ← appends: status_code, duration_ms, outcome → logger.info(event)
```

### Adding business context from a handler

```typescript
import { addToEvent } from "@/lib/types";

export const createOrderHandler: AppRouteHandler<CreateOrderRoute> = async (c) => {
  const body = c.req.valid("json");
  const result = await createOrder(body);

  // Enrich the wide event with business context
  if (result.ok) {
    addToEvent(c, {
      order: { id: result.value.id, total_cents: result.value.totalCents },
    });
    return c.json(success(result.value), CREATED);
  }

  return c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), INTERNAL_SERVER_ERROR);
};
```

Every authenticated request automatically carries `user.id` and `user.role` — `authMiddleware` adds them without the handler needing to.

### Sampling

The wide event middleware uses **tail-based sampling** — the decision is made after the request completes:

| Condition | Kept? |
|---|---|
| `status_code >= 500` | Always |
| `outcome === "error"` | Always |
| `duration_ms > 2000` | Always |
| `user.role === "admin"` | Always |
| Everything else | 5% random sample |

This keeps Axiom ingest costs low while guaranteeing 100% capture of the events that matter.

### Axiom setup

Add to `.env.production`:

```
AXIOM_TOKEN=your-axiom-api-token
AXIOM_DATASET=your-dataset-name
SERVICE_VERSION=<injected-by-ci-as-git-sha>
REGION=eu-west-1
```

In development these vars are absent and logs go to stdout with `pino-pretty`. In production, pino writes to both stdout (captured by Docker) and Axiom simultaneously.

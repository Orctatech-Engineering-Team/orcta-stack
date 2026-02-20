# Backend Decisions

Why we chose what we chose.

---

## Hono over Express/Fastify

**Choice**: Hono

**Why**:

1. **Native TypeScript** — Written in TypeScript, not typed after the fact. Types are accurate and complete.

2. **Web Standards** — Uses `Request`/`Response` from the Fetch API. Your code works in Node, Deno, Bun, and edge runtimes without changes.

3. **First-class OpenAPI** — `@hono/zod-openapi` integrates Zod schemas directly into route definitions. One source of truth for validation and docs.

4. **Performance** — Faster than Express. Comparable to Fastify. Uses a fast RegExp-based router.

5. **Minimal** — No opinions about structure. No magic. You see exactly what's happening.

**Trade-offs**:

- Smaller ecosystem than Express (but growing fast)
- Fewer tutorials and Stack Overflow answers
- Some middleware needs manual porting

**Example of the difference**:

```typescript
// Express — types are bolted on, validation is separate
app.post('/users', validateBody(schema), (req: Request, res: Response) => {
  const body = req.body; // any, unless you cast
});

// Hono — types flow from schema, validation is declarative
const route = createRoute({
  method: 'post',
  path: '/users',
  request: { body: { content: { 'application/json': { schema: userSchema } } } },
  responses: { 201: { content: { 'application/json': { schema: userResponseSchema } } } },
});

app.openapi(route, (c) => {
  const body = c.req.valid('json'); // Fully typed from schema
});
```

---

## Drizzle over Prisma

**Choice**: Drizzle ORM

**Why**:

1. **SQL-first** — Drizzle queries look like SQL. If you know SQL, you know Drizzle.

```typescript
// Drizzle — reads like SQL
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.status, 'active'))
  .limit(10);

// Prisma — proprietary API
const users = await prisma.user.findMany({
  where: { status: 'active' },
  take: 10,
});
```

2. **No code generation** — Prisma requires `prisma generate` after schema changes. Drizzle schemas are just TypeScript. Change and go.

3. **Lightweight** — No engine binary. Drizzle is ~50KB. Prisma ships a Rust query engine.

4. **Better types** — `$inferSelect` and `$inferInsert` give you exact types from your schema. No drift.

5. **Migrations as SQL** — Drizzle generates plain SQL migrations. You can read and edit them. Prisma migrations are harder to customize.

**Trade-offs**:

- Less hand-holding for complex relations
- Fewer built-in features (soft deletes, etc.)
- Younger ecosystem, fewer adapters

---

## Discriminated Unions over Exceptions

**Choice**: Return discriminated unions from use-cases

**Why**:

1. **Explicit outcomes** — Every possible result is in the type signature. No hidden `throw` statements.

```typescript
// Exceptions — caller doesn't know what can go wrong
async function createUser(data): Promise<User> {
  // Might throw ValidationError, DuplicateError, DatabaseError...
  // Caller has to guess or read implementation
}

// Discriminated unions — outcomes are explicit
async function createUser(data): Promise<
  | { type: 'CREATED'; user: User }
  | { type: 'EMAIL_EXISTS' }
  | { type: 'INVALID_DATA'; errors: string[] }
> {
  // Caller knows exactly what to handle
}
```

2. **Exhaustive checking** — TypeScript errors if you forget a case.

```typescript
switch (result.type) {
  case 'CREATED': return c.json(result.user, 201);
  case 'EMAIL_EXISTS': return c.json({ error: 'Email taken' }, 409);
  // TypeScript: "Property 'INVALID_DATA' is missing"
}
```

3. **No try-catch chains** — Exceptions bubble up. You need try-catch everywhere or risk unhandled errors. Unions are handled where they're used.

4. **Better for async** — Exceptions in async code are easy to lose. Forgotten `await`, missing `.catch()`. Unions are just data.

5. **Testing is simpler** — Return values are easier to assert than thrown errors.

**Trade-offs**:

- More typing (literally, keystrokes)
- Team needs to learn the pattern
- Some libraries still throw (wrap them at the boundary)

---

## Repository Pattern

**Choice**: Plain async functions, one file per module

**Why**:

The classic port/adapter split (a TypeScript interface + a separate Drizzle implementation) adds indirection without payoff at this scale:
- We never swap the underlying database at runtime
- The DB can run locally in tests — mocking is not needed
- One extra file per module accumulates quickly

Instead, repositories are plain async functions in a single `*.repository.ts` file. Each function:
- Returns `Result<T, DomainError | InfrastructureError>` — never throws
- Wraps all DB calls in `tryInfra` — single catch boundary
- Is tested directly against a real Postgres instance

```typescript
// users.repository.ts — plain functions, no interface, no DI
export async function findUserById(
  id: string,
): Promise<Result<User, UserNotFound | InfrastructureError>> {
  const result = await tryInfra(`fetch user ${id}`, () =>
    db.query.users.findFirst({ where: eq(users.id, id) }),
  );
  if (!result.ok) return result;
  if (!result.value) return err({ type: "USER_NOT_FOUND", lookup: id });
  return ok(result.value);
}
```

**Testing without mocks**: repositories are integration-tested against a real local DB.
The `Result` return type makes assertions straightforward without any mock setup:

```typescript
const result = await findUserById("nonexistent");
expect(result).toEqual({ ok: false, error: { type: "USER_NOT_FOUND", lookup: "nonexistent" } });
```

**Trade-offs**:

- No ability to inject a fake repo (not needed — real DB is fast and simple)
- Tight coupling to Drizzle (acceptable — swap cost is low when it's just functions)

---

## better-auth over Lucia/NextAuth

**Choice**: better-auth

**Why**:

1. **Database agnostic** — Works with any database via adapters. Drizzle adapter included.

2. **Session-based by default** — JWTs are stateless but hard to revoke. Sessions are simpler and more secure.

3. **Built-in features** — Email/password, OAuth, email verification, password reset. No assembly required.

4. **TypeScript native** — Types are correct and complete.

5. **Framework agnostic** — Works with Hono, Express, anything with Request/Response.

**Configuration**:

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Refresh daily
  },
});
```

**Trade-offs**:

- Newer library, smaller community
- Some advanced features still in development
- Documentation could be better

---

## Zod for Validation

**Choice**: Zod everywhere

**Why**:

1. **One schema, many uses** — Validate requests, generate OpenAPI, infer TypeScript types.

```typescript
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

type User = z.infer<typeof userSchema>;  // TypeScript type
// Also used for request validation and OpenAPI spec
```

2. **Composable** — Schemas combine, extend, pick, omit.

```typescript
const createUserSchema = userSchema.extend({ password: z.string().min(8) });
const updateUserSchema = userSchema.partial();
const publicUserSchema = userSchema.omit({ email: true });
```

3. **Great errors** — Parse errors are detailed and structured.

4. **TypeScript first** — Types are derived, not duplicated.

**Trade-offs**:

- Bundle size (tree-shake helps)
- Slower than hand-written validation (rarely matters)

---

## Error Stratification

**Choice**: Infrastructure errors vs domain errors

**Why**:

Not all errors are equal:

| Type | Example | Handling |
|------|---------|----------|
| Infrastructure | DB timeout, network failure | 500, log, don't expose details |
| Domain | User not found, email taken | 4xx, return specific message |
| Validation | Invalid email format | 400, return field errors |

**Implementation**:

```typescript
// Infrastructure — something broke, not user's fault
class InfrastructureError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
  }
}

// Domain — business rule violation
// Handled via discriminated unions, not exceptions

// Validation — handled by Zod at the route level
```

**In handlers**:

```typescript
switch (result.type) {
  case 'USER_NOT_FOUND':
    // Domain error — tell them what happened
    return c.json({ error: 'User not found' }, 404);
  case 'INFRASTRUCTURE_ERROR':
    // Infrastructure — log it, give generic response
    logger.error(result.error);
    return c.json({ error: 'Internal error' }, 500);
}
```

---

## Module Structure

**Choice**: Feature-based modules with consistent flat file naming

**Why**:

1. **Colocation** — Everything for a feature is in one folder. No jumping between `/controllers`, `/services`, `/repositories`.

2. **Predictability** — Same structure everywhere. Once you've seen one module, you've seen them all.

3. **Encapsulation** — Modules can be moved, deleted, or extracted to a package.

**The structure**:

```
modules/users/
  index.ts               # Exports the router
  routes.ts              # OpenAPI route definitions + exported route types
  handlers.ts            # HTTP handlers (imperative shell)
  users.errors.ts        # Domain error type variants
  users.repository.ts    # Data access functions (return Result, never throw)
  users.usecases.ts      # Pure business logic (add when needed)
  __tests__/
    users.usecases.test.ts    # Pure unit tests (no DB)
    users.repository.test.ts  # Integration tests (real DB)
    handlers.test.ts          # HTTP integration tests (full stack via app.request)
```

The `usecases.ts` file is **optional** — add it when business rules exist that are worth testing in isolation. Skip it for pure CRUD modules.

**Naming conventions**:

| File | Purpose |
|------|---------|
| `*.errors.ts` | Domain error discriminated union types |
| `*.repository.ts` | Data access — `tryInfra`, `Result`, never throws |
| `*.usecases.ts` | Pure business logic — no DB imports, no async |
| `routes.ts` | `createRoute` definitions + exported route types |
| `handlers.ts` | `AppRouteHandler` implementations |
| `index.ts` | Creates router, wires routes → handlers, default export |

---

## Dependency Management

**Choice**: Direct imports, no DI container

**Why**:

Repositories and use-cases are module-level functions, not classes. Their dependencies (the `db` connection, `env` config) are imported directly at module scope.

This works because:
- The DB is a single Postgres connection pool shared across the process
- Tests use environment-specific config (`.env.test` → different DB URL in CI if needed)
- Use-cases are pure functions with no dependencies at all
- There is nothing to swap at runtime

Adding a DI container (tsyringe, inversify, etc.) would require decorators, a reflect-metadata polyfill, class-based repositories, and configuration that provides no practical benefit over direct imports at this scale.

**Trade-offs**:

- No runtime swapping of implementations
- Tighter coupling between repository functions and the `db` singleton (acceptable — it's the intended deployment model)

---

## Observability: Wide Events over Logs + Metrics

**Choice**: One structured wide event per request → Axiom via `@axiomhq/pino`, with tail-based sampling.

### Sources

This decision is grounded in two bodies of work:

1. **[loggingsucks.com](https://loggingsucks.com)** by Boris Tane (2024) — a practical synthesis of the wide events pattern with a concrete implementation walkthrough. The article coined the framing we use: "instead of logging what your code is doing, log what happened to this request."

2. **Charity Majors** (CTO, Honeycomb) — the originator of the "high-cardinality, high-dimensionality observability" approach. Her key argument: traditional APM and log aggregators are optimized for *writing* (counters, pre-aggregated metrics, plain strings), not *querying*. When something breaks, you don't know in advance which dimensions you'll need to slice on. You need to be able to ask arbitrary questions of your production data.

The pattern is also known as the **Canonical Log Line**, popularised by Stripe.

---

### The problem this solves

Traditional logging against a single checkout request generates ~17 scattered log lines:

```
[INFO] Request received from 192.168.1.50
[DEBUG] JWT validation started
[WARN] Slow database query detected duration_ms=847
[DEBUG] Redis cache lookup failed
[INFO] Request completed status=200
```

These lines cannot be correlated without a trace_id. They don't contain the information you need to answer "why did user X's checkout fail?" — you'd need to grep across them, inferring context from timestamps. At 10,000 requests/second, that's 170,000 log lines/second, most of them saying nothing useful.

The core failure is that **logs are optimised for writing, not querying**. They're written by developers at 9am thinking "this might be useful" — not by someone debugging at 2am.

---

### Principles derived

These principles run through every implementation decision below:

**1. High cardinality** — the ability to filter by any unique value: `user_id`, `request_id`, `trace_id`, `session_id`. Legacy systems (ELK, hosted Datadog with metrics) pre-aggregate data and discard the individual values, making it impossible to answer "was this specific user affected?".

**2. High dimensionality** — many fields per event. A wide event with 40 fields can answer 40 independent questions. A 3-field log line can answer three.

**3. One event per request, emitted once** — not 17 log lines that require manual correlation. Build the event throughout the request lifecycle, emit in the `finally` block.

**4. Structured events are non-negotiable** — JSON only, always. String-search treats logs as bags of characters. Structured querying treats them as rows in a table.

**5. Tail-based sampling over head-based** — make the sampling decision *after* the request completes, when you know the outcome. Head-based (random at start) has a 90% chance of dropping the specific error you need at 1% sample rate. Tail-based keeps 100% of errors at any sample rate.

**6. OTel is plumbing, not observability** — OpenTelemetry standardises delivery. It does not decide what to capture. You can emit bad telemetry in a standardised format. The mental model shift (emit events not log statements) matters far more than which protocol transports them.

---

### Why Axiom over ELK / Datadog / Grafana Loki

| Concern | Axiom | ELK | Loki |
|---|---|---|---|
| High-cardinality queries | ✅ ClickHouse-backed | ❌ Elasticsearch chokes | ⚠️ Slow |
| Zero infra to run | ✅ SaaS | ❌ Run your own | ❌ Run your own |
| Structured event querying | ✅ APL (SQL-like) | ⚠️ Lucene syntax | ❌ Label-based only |
| Generous free tier | ✅ 500GB/month | ❌ Self-hosted cost | ⚠️ Hosted cost |
| pino transport available | ✅ `@axiomhq/pino` | ⚠️ filebeat/logstash | ⚠️ loki-logging-plugin |

Axiom uses ClickHouse under the hood — a columnar database built for high-cardinality, high-dimensionality analytics. This is what Charity Majors' argument points at: the tooling has caught up. The bottleneck is now the mental model, not the storage engine.

When `AXIOM_TOKEN` is not set (local dev, CI), logs go to stdout only. When set, `pino` streams to both stdout and Axiom via a multistream. No sidecar, no agent, no extra infra.

---

### Why we skip OpenTelemetry (for now)

OTel is a protocol for exporting telemetry to a collector. Adding it means:
- Running an OTel collector (more infra)
- Configuring exporters to Axiom's OTLP endpoint
- Writing spans instead of events

For a single-service VPS deployment, this complexity buys nothing. Our `trace_id` field is propagated from the `x-trace-id` request header if set by a gateway, which gives cross-service correlation without a full OTel setup. If we move to microservices, OTel would be the right next step — the `trace_id` field is already in place to hook into it.

---

### What we built

The `WideEvent` type and `addToEvent` primitive implement the pattern directly from the article's "Implementing Wide Events" section, adapted to Hono:

```
Request in
  └── wideEventMiddleware (stamps request + infra context)
        └── authMiddleware (stamps session_id + user context via addToEvent)
              └── handler (stamps domain context via addToEvent)
                    └── wideEventMiddleware finally (stamps outcome, samples, emits)
```

**The fields we instrumenting by default** (without any handler-level code):

| Field | Source | Why |
|---|---|---|
| `request_id` | UUID per request | High-cardinality, uniquely identifies this event |
| `trace_id` | `x-trace-id` header or new UUID | Multi-service correlation without OTel |
| `session_id` | better-auth session ID | Separate from user_id — one user, many sessions |
| `deployment_id` | `DEPLOYMENT_ID` env var | "Which deploy caused this regression?" |
| `service_version` | `SERVICE_VERSION` env var (git SHA) | Code version of the running process |
| `user.id` + `user.role` | auth middleware | Who made this request |
| `status_code`, `duration_ms` | response | Outcome and performance |
| `ip`, `user_agent` | request headers | Client context |

**Tail-based sampling rules** (applied after request completes):

| Condition | Rationale |
|---|---|
| `status_code >= 500` | Infrastructure or application error — never drop |
| `outcome === "error"` | Explicit error outcome — never drop |
| `duration_ms > 2000` | Latency outliers — never drop |
| `user.role === "admin"` | Low-volume, high-signal operational traffic |
| `feature_flags` present | Request is part of a feature rollout — critical for debugging |
| Everything else | 5% random sample |

The feature_flags rule was added beyond the article's example. During a feature rollout, dropping 95% of flagged requests would make it impossible to analyse the new behaviour. Handlers annotate rollout requests with:
```typescript
addToEvent(c, { feature_flags: { new_checkout_flow: true } });
```
and those events are always retained.

---

### What we explicitly left out

**`subscription_tier` / user plan on the `user` field** — the article's canonical example includes `user.subscription: "premium"`. We left it as a `[k: string]: unknown` extension point rather than baking it in: not every app built on this template will have subscription tiers. Add it in `authMiddleware.ts` by extending the `addToEvent` call with your user's plan field once it exists on the user record.

**`error.code` and `error.retriable`** — typed on `WideEvent.error` as optional fields. The middleware catches unhandled errors and populates `type` and `message` automatically. Handlers should add `code` and `retriable` for business-logic errors where that context is meaningful (e.g. payment failures with Stripe decline codes).

**Metrics** — no Prometheus, no StatsD, no counters. The same queries you'd run on a metrics dashboard (error rate by endpoint, p99 latency) can be run as APL aggregations on wide events in Axiom. One data store, one query language, no cardinality limit.


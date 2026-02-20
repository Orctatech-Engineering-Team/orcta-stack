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

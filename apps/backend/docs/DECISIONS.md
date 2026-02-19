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

**Choice**: Interface (port) + implementation (adapter)

**Why**:

1. **Testability** — Inject a mock repository in tests. No database needed.

```typescript
// Test with fake data
const fakeRepo = {
  findById: async (id) => ({ id, name: 'Test User' }),
};
const result = await getUserUseCase({ userRepo: fakeRepo }, { id: '123' });
```

2. **Swappable** — Change from Drizzle to Prisma, or PostgreSQL to MongoDB. Use-cases don't change.

3. **Clear contracts** — The interface defines exactly what data access you need. No "just import db and figure it out".

4. **Single responsibility** — Repositories do data access. Use-cases do business logic. Neither does both.

**The pattern**:

```typescript
// user.repo.port.ts — What you need
interface UserRepo {
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  insert(data: InsertUser): Promise<User>;
}

// user.repo.drizzle.ts — How you get it
const userRepo: UserRepo = {
  async findById(id) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },
  // ...
};

// Use-case doesn't know or care about Drizzle
async function getUser(deps: { userRepo: UserRepo }, input) {
  return deps.userRepo.findById(input.id);
}
```

**Trade-offs**:

- More files
- Indirection (port → adapter)
- Overkill for simple CRUD apps

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

**Choice**: Feature-based modules with consistent file naming

**Why**:

1. **Colocation** — Everything for a feature is in one folder. No jumping between `/controllers`, `/services`, `/repositories`.

2. **Predictability** — Same structure everywhere. Once you've seen one module, you've seen them all.

3. **Encapsulation** — Modules can be moved, deleted, or extracted to a package.

**The structure**:

```
modules/users/
  index.ts              # Exports the router
  routes.ts             # OpenAPI route definitions
  handlers.ts           # HTTP handlers
  users.repo.port.ts    # Repository interface
  users.repo.drizzle.ts # Repository implementation
  usecases/
    create-user.usecase.ts
    get-user.usecase.ts
    update-user.usecase.ts
```

**Naming conventions**:

| Pattern | Meaning |
|---------|---------|
| `*.usecase.ts` | Business logic, pure functions |
| `*.repo.port.ts` | Data access interface |
| `*.repo.drizzle.ts` | Drizzle implementation |
| `*.repo.memory.ts` | In-memory implementation (for tests) |
| `*.policy.ts` | Business rules, pure functions |

---

## Dependency Injection Style

**Choice**: Function parameter injection, not containers

**Why**:

1. **Explicit** — Dependencies are visible in the function signature.

2. **Simple** — No DI container to learn, configure, or debug.

3. **Testable** — Pass mocks directly. No container overrides.

```typescript
// Dependencies are just parameters
async function createUserUseCase(
  deps: {
    userRepo: UserRepo;
    emailService: EmailService;
  },
  input: CreateUserInput
) {
  // Use deps.userRepo, deps.emailService
}

// In handlers — wire real implementations
const result = await createUserUseCase(
  { userRepo, emailService },
  input
);

// In tests — wire mocks
const result = await createUserUseCase(
  { userRepo: mockUserRepo, emailService: mockEmailService },
  input
);
```

**Trade-offs**:

- Manual wiring (but it's explicit)
- No automatic singleton management
- No lifecycle hooks

For this scale, the simplicity wins.

# Backend Architecture

## Layer Overview

```
HTTP Layer: routes.ts → handlers.ts
                ↓
Application:  usecases/*.usecase.ts
                ↓
Infrastructure: *.repo.port.ts → *.repo.drizzle.ts
                ↓
Database:     Drizzle ORM
```

## Key Pattern: Discriminated Unions

Use-cases return explicit outcomes instead of throwing exceptions:

```typescript
// Define possible outcomes
type CreateUserResult =
  | { type: "CREATED"; user: User }
  | { type: "EMAIL_EXISTS"; message: string };

// Use-case returns one of these
async function createUserUseCase(deps, input): Promise<CreateUserResult> {
  const existing = await deps.userRepo.findByEmail(input.email);
  if (existing) {
    return { type: "EMAIL_EXISTS", message: "Email taken" };
  }
  const user = await deps.userRepo.insert(input);
  return { type: "CREATED", user };
}

// Handler maps to HTTP
switch (result.type) {
  case "CREATED":
    return c.json(success(result.user), 201);
  case "EMAIL_EXISTS":
    return c.json(failure({ code: "EMAIL_EXISTS", message: result.message }), 409);
}
```

**Why?**
- TypeScript enforces exhaustive handling
- No hidden control flow
- Self-documenting outcomes

## Dependency Injection

Use-cases receive dependencies as parameters:

```typescript
interface CreateUserDeps {
  userRepo: Pick<UserRepo, "findByEmail" | "insert">;
}

async function createUserUseCase(deps: CreateUserDeps, input: CreateUserInput) {
  // Use deps.userRepo
}
```

This enables easy mocking in tests.

## Repository Pattern

Separate interface from implementation:

```typescript
// user.repo.port.ts
interface UserRepo {
  findByEmail(email: string): Promise<User | undefined>;
  insert(data: InsertUser): Promise<User>;
}

// user.repo.drizzle.ts
export const userRepo: UserRepo = {
  async findByEmail(email) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  },
  async insert(data) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },
};
```

## Module Structure

```
modules/{feature}/
├── routes.ts           # OpenAPI definitions
├── handlers.ts         # HTTP → use-case → HTTP
├── index.ts            # Router wiring
├── {feature}.repo.port.ts
├── {feature}.repo.drizzle.ts
└── usecases/
    └── create-{feature}.usecase.ts
```

## Creating a Module

1. Run `pnpm new:module {name}`
2. Define routes with Zod schemas
3. Create repository interface + implementation
4. Write use-cases with discriminated unions
5. Wire handlers
6. Register in `routes/index.ts`

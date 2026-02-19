# Backend Architecture

## Overview

This backend follows Clean Architecture principles with Hono as the web framework.

```
┌─────────────────────────────────────────────────────────────────┐
│                         HTTP Layer                              │
│  routes.ts → handlers.ts                                        │
│  (OpenAPI)    (maps results to HTTP responses)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  usecases/*.usecase.ts                                          │
│  (orchestrates business logic, returns discriminated unions)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                          │
│  *.repo.port.ts → *.repo.drizzle.ts                             │
│  (interface)       (implementation)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

Each feature module follows this structure:

```
modules/{feature}/
├── index.ts                    # Router wiring
├── routes.ts                   # OpenAPI route definitions
├── handlers.ts                 # HTTP handlers
├── {feature}.repo.port.ts      # Repository interface
├── {feature}.repo.drizzle.ts   # Repository implementation
└── usecases/
    ├── create-{feature}.usecase.ts
    ├── get-{feature}.usecase.ts
    └── ...
```

## Key Patterns

### 1. Discriminated Unions

Use-cases return explicit outcomes instead of throwing exceptions:

```typescript
type CreateUserResult =
  | { type: "CREATED"; user: User }
  | { type: "EMAIL_EXISTS"; message: string }
  | { type: "VALIDATION_ERROR"; errors: string[] };

async function createUserUseCase(deps, input): Promise<CreateUserResult> {
  // Returns explicit outcomes
}
```

### 2. Dependency Injection

Use-cases receive dependencies as parameters:

```typescript
interface CreateUserDeps {
  userRepo: UserRepo;
  sendEmail: (to: string, template: EmailTemplate) => Promise<void>;
}

async function createUserUseCase(
  deps: CreateUserDeps,
  input: CreateUserInput
): Promise<CreateUserResult> {
  // Use deps.userRepo, deps.sendEmail
}
```

### 3. Repository Pattern

Separate interface from implementation:

```typescript
// user.repo.port.ts
interface UserRepo {
  findByEmail(email: string): Promise<User | undefined>;
  insert(user: InsertUser): Promise<User>;
}

// user.repo.drizzle.ts
export const userRepo: UserRepo = {
  async findByEmail(email) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  },
  async insert(user) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  },
};
```

## File Naming Conventions

- `*.usecase.ts` - Application logic
- `*.repo.port.ts` - Repository interface
- `*.repo.drizzle.ts` - Drizzle implementation
- `routes.ts` - OpenAPI route definitions
- `handlers.ts` - HTTP handlers

## Creating a New Module

1. Create the module directory: `modules/{feature}/`
2. Define routes with OpenAPI schemas in `routes.ts`
3. Create repository interface in `{feature}.repo.port.ts`
4. Implement repository in `{feature}.repo.drizzle.ts`
5. Write use-cases with discriminated unions
6. Create handlers that map results to HTTP responses
7. Wire everything in `index.ts`
8. Register in `routes/index.ts`

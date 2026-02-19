# Backend Architecture

Simple rules, predictable code.

---

## The Flow

Every request follows the same path:

```
Request → Route → Handler → Use-Case → Repository → Database
```

**Route** — Validates input with Zod, defines OpenAPI spec
**Handler** — Thin. Calls use-case, maps result to HTTP response
**Use-Case** — Business logic. No HTTP concepts. No database imports.
**Repository** — Data access. Interface + implementation.

---

## The One Rule

**Use-cases return discriminated unions, not exceptions.**

```typescript
// ❌ Don't do this
async function createUser(data) {
  const existing = await db.findByEmail(data.email);
  if (existing) throw new Error("Email taken");  // Hidden control flow
  return db.insert(data);
}

// ✅ Do this
type CreateUserResult =
  | { type: "CREATED"; user: User }
  | { type: "EMAIL_EXISTS" };

async function createUser(deps, data): Promise<CreateUserResult> {
  const existing = await deps.userRepo.findByEmail(data.email);
  if (existing) return { type: "EMAIL_EXISTS" };

  const user = await deps.userRepo.insert(data);
  return { type: "CREATED", user };
}
```

Why? TypeScript forces you to handle every case. No surprises.

```typescript
// Handler — compiler ensures you handle all cases
switch (result.type) {
  case "CREATED":
    return c.json(success(result.user), 201);
  case "EMAIL_EXISTS":
    return c.json(failure({ code: "EMAIL_EXISTS", message: "Email taken" }), 409);
  // TypeScript error if you miss a case
}
```

---

## File Structure

```
modules/posts/
  routes.ts              ← OpenAPI route definitions
  handlers.ts            ← HTTP handlers
  index.ts               ← Wires routes to handlers
  posts.repo.port.ts     ← Repository interface
  posts.repo.drizzle.ts  ← Repository implementation
  usecases/
    create-post.usecase.ts
    list-posts.usecase.ts
```

---

## Write a Use-Case

```typescript
// usecases/create-post.usecase.ts

// 1. Define what you need
interface Deps {
  postRepo: Pick<PostRepo, "insert">;
  userRepo: Pick<UserRepo, "findById">;
}

// 2. Define possible outcomes
type Result =
  | { type: "CREATED"; post: Post }
  | { type: "USER_NOT_FOUND" };

// 3. Write pure business logic
export async function createPostUseCase(
  deps: Deps,
  input: { userId: string; title: string; content: string }
): Promise<Result> {
  const user = await deps.userRepo.findById(input.userId);
  if (!user) return { type: "USER_NOT_FOUND" };

  const post = await deps.postRepo.insert({
    authorId: user.id,
    title: input.title,
    content: input.content,
  });

  return { type: "CREATED", post };
}
```

---

## Write a Handler

```typescript
// handlers.ts
import { createPostUseCase } from "./usecases/create-post.usecase";
import { postRepo } from "./posts.repo.drizzle";
import { userRepo } from "../users/users.repo.drizzle";

export const createPostHandler: AppRouteHandler<CreatePostRoute> = async (c) => {
  const userId = c.get("user").id;
  const body = c.req.valid("json");

  const result = await createPostUseCase(
    { postRepo, userRepo },  // Inject deps
    { userId, ...body }
  );

  switch (result.type) {
    case "CREATED":
      return c.json(success(result.post), 201);
    case "USER_NOT_FOUND":
      return c.json(failure({ code: "USER_NOT_FOUND", message: "User not found" }), 404);
  }
};
```

---

## Write a Repository

```typescript
// posts.repo.port.ts — The interface
export interface PostRepo {
  findById(id: string): Promise<Post | undefined>;
  insert(data: InsertPost): Promise<Post>;
  listByAuthor(authorId: string): Promise<Post[]>;
}

// posts.repo.drizzle.ts — The implementation
import { db } from "@/db";
import { posts } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export const postRepo: PostRepo = {
  async findById(id) {
    return db.query.posts.findFirst({ where: eq(posts.id, id) });
  },

  async insert(data) {
    const [post] = await db.insert(posts).values(data).returning();
    return post;
  },

  async listByAuthor(authorId) {
    return db.query.posts.findMany({ where: eq(posts.authorId, authorId) });
  },
};
```

---

## Testing

Use-cases are trivial to test because dependencies are injected:

```typescript
import { createPostUseCase } from "./create-post.usecase";

test("returns USER_NOT_FOUND when user doesn't exist", async () => {
  const deps = {
    userRepo: { findById: async () => undefined },
    postRepo: { insert: async () => ({} as Post) },
  };

  const result = await createPostUseCase(deps, {
    userId: "fake",
    title: "Hello",
    content: "World",
  });

  expect(result.type).toBe("USER_NOT_FOUND");
});
```

---

## Quick Reference

| File | Purpose |
|------|---------|
| `routes.ts` | Zod schemas + OpenAPI definitions |
| `handlers.ts` | HTTP ↔ use-case mapping |
| `*.usecase.ts` | Business logic |
| `*.repo.port.ts` | Data access interface |
| `*.repo.drizzle.ts` | Drizzle implementation |
| `index.ts` | Wire routes to handlers |

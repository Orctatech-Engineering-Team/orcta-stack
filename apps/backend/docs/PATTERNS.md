# Backend Patterns

Recipes for common tasks.

---

## Creating a Complete Module

Here's a full example of a `posts` module with CRUD operations.

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

### 2. Define the Repository

`apps/backend/src/modules/posts/posts.repo.port.ts`:

```typescript
import type { Post, InsertPost } from "@repo/db/schema";

export interface PostRepo {
  findById(id: string): Promise<Post | undefined>;
  findByAuthor(authorId: string): Promise<Post[]>;
  list(options: { limit: number; offset: number }): Promise<Post[]>;
  insert(data: InsertPost): Promise<Post>;
  update(id: string, data: Partial<InsertPost>): Promise<Post | undefined>;
  delete(id: string): Promise<boolean>;
}
```

`apps/backend/src/modules/posts/posts.repo.drizzle.ts`:

```typescript
import { db } from "@/db";
import { posts } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import type { PostRepo } from "./posts.repo.port";

export const postRepo: PostRepo = {
  async findById(id) {
    return db.query.posts.findFirst({ where: eq(posts.id, id) });
  },

  async findByAuthor(authorId) {
    return db.query.posts.findMany({ where: eq(posts.authorId, authorId) });
  },

  async list({ limit, offset }) {
    return db.query.posts.findMany({ limit, offset, orderBy: (p, { desc }) => desc(p.createdAt) });
  },

  async insert(data) {
    const [post] = await db.insert(posts).values(data).returning();
    return post;
  },

  async update(id, data) {
    const [post] = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
    return post;
  },

  async delete(id) {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return result.rowCount > 0;
  },
};
```

### 3. Write Use-Cases

`apps/backend/src/modules/posts/usecases/create-post.usecase.ts`:

```typescript
import type { PostRepo } from "../posts.repo.port";
import type { Post } from "@repo/db/schema";

interface Deps {
  postRepo: Pick<PostRepo, "insert">;
}

interface Input {
  authorId: string;
  title: string;
  content: string;
}

type Result =
  | { type: "CREATED"; post: Post }
  | { type: "TITLE_TOO_SHORT" };

export async function createPostUseCase(deps: Deps, input: Input): Promise<Result> {
  if (input.title.length < 3) {
    return { type: "TITLE_TOO_SHORT" };
  }

  const post = await deps.postRepo.insert({
    authorId: input.authorId,
    title: input.title,
    content: input.content,
  });

  return { type: "CREATED", post };
}
```

`apps/backend/src/modules/posts/usecases/get-post.usecase.ts`:

```typescript
import type { PostRepo } from "../posts.repo.port";
import type { Post } from "@repo/db/schema";

interface Deps {
  postRepo: Pick<PostRepo, "findById">;
}

type Result =
  | { type: "FOUND"; post: Post }
  | { type: "NOT_FOUND" };

export async function getPostUseCase(deps: Deps, id: string): Promise<Result> {
  const post = await deps.postRepo.findById(id);
  if (!post) return { type: "NOT_FOUND" };
  return { type: "FOUND", post };
}
```

### 4. Define Routes

`apps/backend/src/modules/posts/routes.ts`:

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import { selectPostSchema } from "@repo/db/schema";

const tags = ["Posts"];

const postResponse = z.object({
  success: z.literal(true),
  data: selectPostSchema,
});

const postsResponse = z.object({
  success: z.literal(true),
  data: z.array(selectPostSchema),
});

export const createPost = createRoute({
  method: "post",
  path: "/posts",
  tags,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().min(3),
            content: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    201: { content: { "application/json": { schema: postResponse } }, description: "Created" },
    400: { description: "Invalid input" },
  },
});

export const getPost = createRoute({
  method: "get",
  path: "/posts/{id}",
  tags,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: { content: { "application/json": { schema: postResponse } }, description: "Found" },
    404: { description: "Not found" },
  },
});

export const listPosts = createRoute({
  method: "get",
  path: "/posts",
  tags,
  request: {
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: { content: { "application/json": { schema: postsResponse } }, description: "List" },
  },
});

export type CreatePostRoute = typeof createPost;
export type GetPostRoute = typeof getPost;
export type ListPostsRoute = typeof listPosts;
```

### 5. Write Handlers

`apps/backend/src/modules/posts/handlers.ts`:

```typescript
import type { AppRouteHandler } from "@/lib/types";
import { success, failure } from "@/lib/types";
import type { CreatePostRoute, GetPostRoute, ListPostsRoute } from "./routes";
import { createPostUseCase } from "./usecases/create-post.usecase";
import { getPostUseCase } from "./usecases/get-post.usecase";
import { postRepo } from "./posts.repo.drizzle";

export const createPostHandler: AppRouteHandler<CreatePostRoute> = async (c) => {
  const userId = c.get("user").id;
  const body = c.req.valid("json");

  const result = await createPostUseCase({ postRepo }, { authorId: userId, ...body });

  switch (result.type) {
    case "CREATED":
      return c.json(success(result.post), 201);
    case "TITLE_TOO_SHORT":
      return c.json(failure({ code: "TITLE_TOO_SHORT", message: "Title must be at least 3 characters" }), 400);
  }
};

export const getPostHandler: AppRouteHandler<GetPostRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const result = await getPostUseCase({ postRepo }, id);

  switch (result.type) {
    case "FOUND":
      return c.json(success(result.post), 200);
    case "NOT_FOUND":
      return c.json(failure({ code: "NOT_FOUND", message: "Post not found" }), 404);
  }
};

export const listPostsHandler: AppRouteHandler<ListPostsRoute> = async (c) => {
  const { limit, offset } = c.req.valid("query");
  const posts = await postRepo.list({ limit, offset });
  return c.json(success(posts), 200);
};
```

### 6. Wire It Up

`apps/backend/src/modules/posts/index.ts`:

```typescript
import { createRouter } from "@/lib/create-app";
import * as routes from "./routes";
import * as handlers from "./handlers";

const router = createRouter()
  .openapi(routes.createPost, handlers.createPostHandler)
  .openapi(routes.getPost, handlers.getPostHandler)
  .openapi(routes.listPosts, handlers.listPostsHandler);

export default router;
```

Register in `apps/backend/src/routes/index.ts`:

```typescript
import posts from "@/modules/posts";

export const routes = [posts];
```

---

## Authentication Patterns

### Protecting Routes

```typescript
// In app.ts — protect all /api/* routes
app.use("/api/*", authMiddleware());

// Public routes go before the middleware
for (const route of publicRoutes) {
  app.route("/api", route);
}

app.use("/api/*", authMiddleware());

for (const route of routes) {
  app.route("/api", route);
}
```

### Accessing User in Handlers

```typescript
export const handler: AppRouteHandler<Route> = async (c) => {
  const user = c.get("user");     // { id, email, name, role }
  const session = c.get("session"); // { id, userId, expiresAt }

  // Use user.id for ownership checks, etc.
};
```

### Role-Based Access

```typescript
import { requireRole } from "@/middlewares/auth";

// In module index.ts
const router = createRouter()
  .use(requireRole("admin"))  // All routes in this router require admin
  .openapi(routes.adminOnly, handlers.adminOnlyHandler);

// Or per-route in app.ts
app.use("/api/admin/*", requireRole("admin"));
```

### Owner-Only Access

```typescript
export const updatePostHandler: AppRouteHandler<UpdatePostRoute> = async (c) => {
  const userId = c.get("user").id;
  const { id } = c.req.valid("param");

  const post = await postRepo.findById(id);

  if (!post) {
    return c.json(failure({ code: "NOT_FOUND", message: "Post not found" }), 404);
  }

  if (post.authorId !== userId) {
    return c.json(failure({ code: "FORBIDDEN", message: "Not your post" }), 403);
  }

  // Proceed with update...
};
```

---

## Error Handling Patterns

### Wrapping Infrastructure Calls

```typescript
import { InfrastructureError } from "@/lib/error";

export async function findById(id: string): Promise<User | undefined> {
  try {
    return await db.query.users.findFirst({ where: eq(users.id, id) });
  } catch (error) {
    throw new InfrastructureError("Database error fetching user", error);
  }
}
```

### Handling in Use-Cases

```typescript
type Result =
  | { type: "SUCCESS"; data: User }
  | { type: "NOT_FOUND" }
  | { type: "INFRASTRUCTURE_ERROR"; error: Error };

export async function getUser(deps: Deps, id: string): Promise<Result> {
  try {
    const user = await deps.userRepo.findById(id);
    if (!user) return { type: "NOT_FOUND" };
    return { type: "SUCCESS", data: user };
  } catch (error) {
    return { type: "INFRASTRUCTURE_ERROR", error: error as Error };
  }
}
```

### Mapping in Handlers

```typescript
switch (result.type) {
  case "SUCCESS":
    return c.json(success(result.data), 200);
  case "NOT_FOUND":
    return c.json(failure({ code: "NOT_FOUND", message: "User not found" }), 404);
  case "INFRASTRUCTURE_ERROR":
    c.get("logger").error(result.error); // Log the real error
    return c.json(failure({ code: "INTERNAL_ERROR", message: "Something went wrong" }), 500);
}
```

---

## Pagination Pattern

### In Repository

```typescript
interface ListOptions {
  limit: number;
  offset: number;
  orderBy?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

async list(options: ListOptions): Promise<PaginatedResult<Post>> {
  const [data, countResult] = await Promise.all([
    db.query.posts.findMany({
      limit: options.limit,
      offset: options.offset,
      orderBy: (p, { asc, desc }) =>
        options.order === "asc"
          ? asc(p[options.orderBy || "createdAt"])
          : desc(p[options.orderBy || "createdAt"]),
    }),
    db.select({ count: sql<number>`count(*)` }).from(posts),
  ]);

  return { data, total: countResult[0].count };
}
```

### In Route

```typescript
export const listPosts = createRoute({
  // ...
  request: {
    query: z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(postSchema),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
  },
});
```

### In Handler

```typescript
export const listPostsHandler: AppRouteHandler<ListPostsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const { data, total } = await postRepo.list({ limit, offset });
  const totalPages = Math.ceil(total / limit);

  return c.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages },
  }, 200);
};
```

---

## Testing Patterns

### Unit Testing Use-Cases

```typescript
import { describe, it, expect, vi } from "vitest";
import { createPostUseCase } from "./create-post.usecase";

describe("createPostUseCase", () => {
  it("creates a post successfully", async () => {
    const mockPost = { id: "1", title: "Hello", content: "World", authorId: "user-1" };
    const deps = {
      postRepo: {
        insert: vi.fn().mockResolvedValue(mockPost),
      },
    };

    const result = await createPostUseCase(deps, {
      authorId: "user-1",
      title: "Hello",
      content: "World",
    });

    expect(result).toEqual({ type: "CREATED", post: mockPost });
    expect(deps.postRepo.insert).toHaveBeenCalledWith({
      authorId: "user-1",
      title: "Hello",
      content: "World",
    });
  });

  it("rejects short titles", async () => {
    const deps = { postRepo: { insert: vi.fn() } };

    const result = await createPostUseCase(deps, {
      authorId: "user-1",
      title: "Hi",
      content: "World",
    });

    expect(result).toEqual({ type: "TITLE_TOO_SHORT" });
    expect(deps.postRepo.insert).not.toHaveBeenCalled();
  });
});
```

### Integration Testing Handlers

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "@/app";

describe("POST /api/posts", () => {
  let authCookie: string;

  beforeAll(async () => {
    // Login and get cookie
    const res = await app.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", password: "password" }),
      headers: { "Content-Type": "application/json" },
    });
    authCookie = res.headers.get("set-cookie") || "";
  });

  it("creates a post", async () => {
    const res = await app.request("/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Test Post", content: "Content" }),
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Test Post");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.request("/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Test", content: "Content" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(401);
  });
});
```

---

## WebSocket Patterns

### Setting Up WebSocket Route

```typescript
import { createNodeWebSocket } from "@hono/node-ws";
import { wsManager } from "@/lib/ws";

const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

app.get("/ws", upgradeWebSocket((c) => {
  const connectionId = crypto.randomUUID();

  return {
    onOpen(event, ws) {
      wsManager.add(connectionId, ws);
      ws.send(JSON.stringify({ type: "connected", id: connectionId }));
    },

    onMessage(event, ws) {
      const message = JSON.parse(event.data.toString());

      switch (message.type) {
        case "join":
          wsManager.join(connectionId, message.room);
          break;
        case "leave":
          wsManager.leave(connectionId, message.room);
          break;
        case "broadcast":
          wsManager.broadcast(message.room, message.data, connectionId);
          break;
      }
    },

    onClose() {
      wsManager.remove(connectionId);
    },
  };
}));

// Inject into server
const server = serve({ fetch: app.fetch, port: 9999 });
injectWebSocket(server);
```

### Broadcasting from Use-Cases

```typescript
import { wsManager } from "@/lib/ws";

export async function createCommentUseCase(deps: Deps, input: Input): Promise<Result> {
  const comment = await deps.commentRepo.insert(input);

  // Notify everyone watching this post
  wsManager.broadcast(`post:${input.postId}`, {
    type: "new-comment",
    data: comment,
  });

  return { type: "CREATED", comment };
}
```

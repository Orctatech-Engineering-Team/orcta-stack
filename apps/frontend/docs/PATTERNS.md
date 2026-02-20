# Frontend Patterns

Recipes for common tasks.

---

## Pages with Data Loading

### Basic Page

```tsx
// routes/posts.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const Route = createFileRoute("/posts")({
  component: PostsPage,
});

function PostsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => api.get("/api/posts"),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Posts</h1>
      {data.data.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

### Page with Route Loader (No Loading State)

```tsx
// routes/posts.$id.tsx
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";

export const Route = createFileRoute("/posts/$id")({
  loader: async ({ params }) => {
    const res = await api.get(`/api/posts/${params.id}`);
    if (!res.success) throw new Error("Post not found");
    return res.data;
  },
  component: PostPage,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});

function PostPage() {
  const post = Route.useLoaderData();  // Already loaded!

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### Page with Search Params

```tsx
// routes/posts.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  page: z.number().default(1),
  search: z.string().optional(),
  status: z.enum(["all", "published", "draft"]).default("all"),
});

export const Route = createFileRoute("/posts")({
  validateSearch: searchSchema,
  component: PostsPage,
});

function PostsPage() {
  const { page, search, status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data } = useQuery({
    queryKey: ["posts", { page, search, status }],
    queryFn: () => api.get("/api/posts", { params: { page, search, status } }),
  });

  return (
    <div>
      <input
        value={search || ""}
        onChange={(e) => navigate({ search: { search: e.target.value } })}
        placeholder="Search..."
      />

      <select
        value={status}
        onChange={(e) => navigate({ search: { status: e.target.value } })}
      >
        <option value="all">All</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>

      <Pagination
        page={page}
        totalPages={data?.pagination.totalPages || 1}
        onChange={(p) => navigate({ search: { page: p } })}
      />
    </div>
  );
}
```

---

## Forms

### Basic Form with Validation

```tsx
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/lib/api";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
});

function CreatePostForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm({
    defaultValues: {
      title: "",
      content: "",
    },
    validators: {
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      try {
        await api.post("/api/posts", value);
        toast.success("Post created!");
        form.reset();
        onSuccess?.();
      } catch (error) {
        toast.error("Failed to create post");
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="title">
        {(field) => (
          <div>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-red-500">{field.state.meta.errors.join(", ")}</span>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="content">
        {(field) => (
          <div>
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-red-500">{field.state.meta.errors.join(", ")}</span>
            )}
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Post"}
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}
```

### Edit Form with Initial Data

```tsx
function EditPostForm({ post }: { post: Post }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      title: post.title,
      content: post.content,
    },
    validators: {
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      await api.patch(`/api/posts/${post.id}`, value);
      queryClient.invalidateQueries({ queryKey: ["posts", post.id] });
      toast.success("Post updated!");
      navigate({ to: "/posts/$id", params: { id: post.id } });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* ... form fields same pattern as above ... */}

      <form.Subscribe selector={(state) => [state.isSubmitting, state.isDirty]}>
        {([isSubmitting, isDirty]) => (
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate({ to: ".." })}>
              Cancel
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
```

### Async Validation (e.g., Check Username Availability)

```tsx
const form = useForm({
  defaultValues: { username: "" },
  validators: {
    onChange: z.object({
      username: z.string().min(3),
    }),
    onChangeAsyncDebounceMs: 500,
    onChangeAsync: async ({ value }) => {
      const available = await api.get(`/api/check-username?q=${value.username}`);
      if (!available) {
        return { fields: { username: "Username already taken" } };
      }
    },
  },
});
```

---

## Authentication Flow

### Auth Context with TanStack Query

```tsx
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
});

// hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const result = await authClient.getSession();
      return result.data;
    },
    staleTime: 1000 * 60 * 5,  // 5 minutes
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const result = await authClient.signIn.email(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(["session"], null);
      queryClient.clear();
    },
  });
}
```

### Protected Route

```tsx
// routes/_authenticated.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: ["session"],
      queryFn: async () => {
        const result = await authClient.getSession();
        return result.data;
      },
    });

    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: () => <Outlet />,
});

// routes/_authenticated/dashboard.tsx — Automatically protected
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});
```

### Login Page with Redirect

```tsx
// routes/login.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const login = useLogin();

  const onSubmit = async (data: LoginForm) => {
    await login.mutateAsync(data);
    navigate({ to: redirectTo || "/dashboard" });
  };

  // ... form JSX
}
```

---

## Mutations with Optimistic Updates

### Like Button

```tsx
function LikeButton({ postId, initialLikes, isLiked }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/posts/${postId}/like`),

    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["posts", postId] });

      // Snapshot
      const previous = queryClient.getQueryData(["posts", postId]);

      // Optimistic update
      queryClient.setQueryData(["posts", postId], (old: Post) => ({
        ...old,
        likes: isLiked ? old.likes - 1 : old.likes + 1,
        isLiked: !isLiked,
      }));

      return { previous };
    },

    onError: (err, vars, context) => {
      // Rollback
      queryClient.setQueryData(["posts", postId], context?.previous);
      toast.error("Failed to like post");
    },

    onSettled: () => {
      // Sync with server
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
    },
  });

  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {isLiked ? "❤️" : "🤍"} {initialLikes + (mutation.isPending ? (isLiked ? -1 : 1) : 0)}
    </button>
  );
}
```

### Delete with Confirmation

```tsx
function DeleteButton({ postId }: { postId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.delete(`/api/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted");
      navigate({ to: "/posts" });
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this post?")) {
      mutation.mutate();
    }
  };

  return (
    <button onClick={handleDelete} disabled={mutation.isPending}>
      {mutation.isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

---

## UI State with Zustand

### Modal State

```tsx
// stores/ui.ts
import { create } from "zustand";

interface UIState {
  modals: {
    createPost: boolean;
    editProfile: boolean;
  };
  openModal: (name: keyof UIState["modals"]) => void;
  closeModal: (name: keyof UIState["modals"]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  modals: {
    createPost: false,
    editProfile: false,
  },
  openModal: (name) =>
    set((state) => ({
      modals: { ...state.modals, [name]: true },
    })),
  closeModal: (name) =>
    set((state) => ({
      modals: { ...state.modals, [name]: false },
    })),
}));

// Usage
function Header() {
  const openModal = useUIStore((s) => s.openModal);

  return (
    <button onClick={() => openModal("createPost")}>
      New Post
    </button>
  );
}

function App() {
  const { createPost } = useUIStore((s) => s.modals);
  const closeModal = useUIStore((s) => s.closeModal);

  return (
    <>
      {/* ... */}
      {createPost && (
        <Modal onClose={() => closeModal("createPost")}>
          <CreatePostForm onSuccess={() => closeModal("createPost")} />
        </Modal>
      )}
    </>
  );
}
```

### Toast Notifications

```tsx
// Use sonner (already included)
import { toast } from "sonner";

// Success
toast.success("Post created!");

// Error
toast.error("Something went wrong");

// With action
toast("Post created", {
  action: {
    label: "View",
    onClick: () => navigate({ to: `/posts/${id}` }),
  },
});

// Promise
toast.promise(mutation.mutateAsync(data), {
  loading: "Creating post...",
  success: "Post created!",
  error: "Failed to create post",
});
```

---

## Component Patterns

### Compound Components

```tsx
// components/Card.tsx
import { createContext, useContext } from "react";

const CardContext = createContext<{ variant: "default" | "elevated" }>({
  variant: "default",
});

function Card({ variant = "default", children, className }: Props) {
  return (
    <CardContext.Provider value={{ variant }}>
      <div className={cn(
        "rounded-lg border",
        variant === "elevated" && "shadow-lg",
        className
      )}>
        {children}
      </div>
    </CardContext.Provider>
  );
}

Card.Header = function CardHeader({ children, className }: Props) {
  return <div className={cn("p-4 border-b", className)}>{children}</div>;
};

Card.Body = function CardBody({ children, className }: Props) {
  return <div className={cn("p-4", className)}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className }: Props) {
  return <div className={cn("p-4 border-t bg-gray-50", className)}>{children}</div>;
};

// Usage
<Card variant="elevated">
  <Card.Header>
    <h2>Title</h2>
  </Card.Header>
  <Card.Body>
    <p>Content</p>
  </Card.Body>
  <Card.Footer>
    <button>Action</button>
  </Card.Footer>
</Card>
```

### Polymorphic Components

```tsx
// components/Button.tsx
import { forwardRef } from "react";

type ButtonProps<T extends React.ElementType = "button"> = {
  as?: T;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
} & React.ComponentPropsWithoutRef<T>;

export const Button = forwardRef(function Button<T extends React.ElementType = "button">(
  { as, variant = "primary", size = "md", className, ...props }: ButtonProps<T>,
  ref: React.ForwardedRef<Element>
) {
  const Component = as || "button";

  return (
    <Component
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded transition-colors",
        {
          primary: "bg-black text-white hover:bg-gray-800",
          secondary: "border border-gray-300 hover:bg-gray-50",
          ghost: "hover:bg-gray-100",
        }[variant],
        {
          sm: "px-3 py-1.5 text-sm",
          md: "px-4 py-2",
          lg: "px-6 py-3 text-lg",
        }[size],
        className
      )}
      {...props}
    />
  );
});

// Usage
<Button>Click me</Button>
<Button as="a" href="/posts">View posts</Button>
<Button as={Link} to="/posts">View posts</Button>
```

---

## Data Fetching Patterns

### Infinite Scroll

```tsx
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

function PostFeed() {
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts", "feed"],
    queryFn: ({ pageParam = 1 }) =>
      api.get("/api/posts", { params: { page: pageParam } }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div>
      {data?.pages.map((page) =>
        page.data.map((post) => <PostCard key={post.id} post={post} />)
      )}

      <div ref={ref}>
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}
```

### Prefetching on Hover

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

function PostLink({ post }: { post: Post }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ["posts", post.id],
      queryFn: () => api.get(`/api/posts/${post.id}`),
      staleTime: 1000 * 60, // 1 minute
    });
  };

  return (
    <Link
      to="/posts/$id"
      params={{ id: post.id }}
      onMouseEnter={prefetch}
      onFocus={prefetch}
    >
      {post.title}
    </Link>
  );
}
```

---

## Error Handling

### Error Boundary for Routes

```tsx
// routes/__root.tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Try again
        </button>
      </div>
    </div>
  ),
});
```

### Query Error Handling

```tsx
const { data, error, refetch } = useQuery({
  queryKey: ["posts"],
  queryFn: () => api.get("/api/posts"),
  retry: (failureCount, error) => {
    // Don't retry on 4xx errors
    if (error.status >= 400 && error.status < 500) return false;
    return failureCount < 3;
  },
});

if (error) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <p className="text-red-800">{error.message}</p>
      <button onClick={() => refetch()} className="text-red-600 underline">
        Try again
      </button>
    </div>
  );
}
```

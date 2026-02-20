# Frontend Decisions

Why we chose what we chose.

---

## TanStack Router over React Router

**Choice**: TanStack Router

**Why**:

1. **Type-safe routing** — Routes, params, and search params are fully typed. TypeScript catches broken links at compile time.

```typescript
// React Router — types are manual and can drift
const { id } = useParams<{ id: string }>();  // You hope id exists

// TanStack Router — types are derived from route definition
const { id } = Route.useParams();  // TypeScript knows id is string
```

2. **File-based routing** — Create a file, get a route. No manual route configuration.

```
routes/
  __root.tsx      →  Layout wrapper
  index.tsx       →  /
  posts.tsx       →  /posts
  posts.$id.tsx   →  /posts/:id
  posts.new.tsx   →  /posts/new
```

3. **Built-in data loading** — Load data before rendering. No loading spinners for initial page load.

```typescript
export const Route = createFileRoute("/posts/$id")({
  loader: async ({ params }) => {
    return fetchPost(params.id);
  },
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData();  // Already loaded, typed
}
```

4. **Search params as state** — Type-safe URL search params. Shareable, bookmarkable state.

```typescript
const searchSchema = z.object({
  page: z.number().default(1),
  filter: z.enum(["all", "published", "draft"]).default("all"),
});

export const Route = createFileRoute("/posts")({
  validateSearch: searchSchema,
});

function PostsPage() {
  const { page, filter } = Route.useSearch();  // Typed!
  const navigate = Route.useNavigate();

  // Update URL search params
  navigate({ search: { page: page + 1 } });
}
```

5. **Devtools** — Visual route tree, navigation history, cache state.

**Trade-offs**:

- Learning curve (different mental model)
- Smaller ecosystem
- File naming conventions matter

---

## TanStack Query over SWR / Plain Fetch

**Choice**: TanStack Query (React Query)

**Why**:

1. **Automatic caching** — Fetch once, use everywhere. Components subscribe to cached data.

```typescript
// This doesn't refetch if data is fresh
const { data: user } = useQuery({
  queryKey: ["user", userId],
  queryFn: () => api.get(`/users/${userId}`),
});
```

2. **Background updates** — Stale data shows immediately while fresh data loads.

3. **Mutations with optimistic updates** — Update UI before server confirms.

```typescript
const mutation = useMutation({
  mutationFn: (data) => api.post("/posts", data),
  onMutate: async (newPost) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["posts"] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(["posts"]);

    // Optimistically update
    queryClient.setQueryData(["posts"], (old) => [...old, newPost]);

    return { previous };
  },
  onError: (err, newPost, context) => {
    // Rollback on error
    queryClient.setQueryData(["posts"], context.previous);
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  },
});
```

4. **Automatic retries** — Failed requests retry with exponential backoff.

5. **Devtools** — Inspect cache, trigger refetches, test loading states.

**Configuration**:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,     // Data fresh for 1 minute
      retry: 1,                  // Retry failed requests once
      refetchOnWindowFocus: true, // Refetch when tab becomes active
    },
  },
});
```

**Trade-offs**:

- Another abstraction layer
- Bundle size (~13KB gzipped)
- Learning curve for cache invalidation

---

## Zustand over Redux / Context

**Choice**: Zustand for UI state

**Why**:

1. **Minimal boilerplate** — No actions, reducers, action creators. Just functions that update state.

```typescript
// Redux way
const slice = createSlice({
  name: "ui",
  initialState: { sidebarOpen: false },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen },
  },
});
export const { toggleSidebar } = slice.actions;

// Zustand way
const useUIStore = create((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

2. **No Provider needed** — Works outside React tree. Use in utilities, event handlers.

3. **Selective subscriptions** — Components only re-render when their selected state changes.

```typescript
// Only re-renders when sidebarOpen changes
const sidebarOpen = useUIStore((s) => s.sidebarOpen);

// Doesn't re-render when other state changes
const toggleSidebar = useUIStore((s) => s.toggleSidebar);
```

4. **TypeScript native** — Types just work.

5. **Tiny** — ~1KB gzipped.

**When to use what**:

| State Type | Solution |
|------------|----------|
| Server data | TanStack Query |
| URL state | TanStack Router search params |
| Form state | TanStack Form |
| UI state (modals, sidebars) | Zustand |
| Component-local state | useState |

**Trade-offs**:

- Less structure (freedom can mean inconsistency)
- No time-travel debugging
- Manual devtools setup

---

## TanStack Form over React Hook Form

**Choice**: TanStack Form + Zod

**Why**:

1. **Full TanStack ecosystem** — Same patterns as Router and Query. Consistent mental model.

2. **First-class TypeScript** — Types are inferred from your schema and form definition.

3. **Framework agnostic** — Works with React, Vue, Solid. Learn once.

4. **Zod integration** — Same schemas as backend. Validate once, use everywhere.

```typescript
const form = useForm({
  defaultValues: { email: "", password: "" },
  validators: {
    onChange: z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }),
  },
  onSubmit: async ({ value }) => {
    await api.post("/login", value);
  },
});
```

5. **Field-level control** — Each field manages its own state and validation.

```tsx
<form.Field name="email">
  {(field) => (
    <div>
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors.length > 0 && (
        <span>{field.state.meta.errors.join(", ")}</span>
      )}
    </div>
  )}
</form.Field>
```

6. **Async validation** — Built-in support for server-side validation.

```typescript
validators: {
  onChangeAsync: async ({ value }) => {
    const exists = await checkEmailExists(value.email);
    if (exists) return "Email already taken";
  },
  onChangeAsyncDebounceMs: 500,
}
```

**Trade-offs**:

- More verbose than React Hook Form's `register`
- Newer library, smaller community
- Controlled by default (more re-renders, but predictable)

---

## Tailwind v4 over CSS Modules / Styled Components

**Choice**: Tailwind CSS v4

**Why**:

1. **Speed** — Style without context-switching. No naming things.

2. **Consistency** — Design tokens built in. Colors, spacing, typography are constrained.

3. **Performance** — Only ships CSS you use. ~10KB typical.

4. **v4 improvements**:
   - Native CSS cascade layers
   - Lightning CSS for parsing (faster builds)
   - Simplified configuration

**Pattern — Component variants with CVA**:

```typescript
import { cva } from "class-variance-authority";

const button = cva(
  "px-4 py-2 rounded font-medium transition-colors",
  {
    variants: {
      intent: {
        primary: "bg-black text-white hover:bg-gray-800",
        secondary: "border border-gray-300 hover:bg-gray-50",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "text-sm px-3 py-1.5",
        md: "text-base px-4 py-2",
        lg: "text-lg px-6 py-3",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "md",
    },
  }
);

function Button({ intent, size, className, ...props }) {
  return <button className={button({ intent, size, className })} {...props} />;
}
```

**Trade-offs**:

- HTML can look cluttered
- Learning utility names
- Custom designs need configuration

---

## Radix over Headless UI / Reach

**Choice**: Radix UI primitives

**Why**:

1. **Accessibility built-in** — ARIA attributes, keyboard navigation, focus management.

2. **Unstyled** — Primitives are components, not opinions. Style with Tailwind.

3. **Composable** — Build complex UI from simple parts.

```tsx
import * as Dialog from "@radix-ui/react-dialog";

function Modal({ trigger, title, children }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
          <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
          {children}
          <Dialog.Close className="absolute top-4 right-4">×</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

4. **Animation-ready** — Data attributes for enter/exit states. Works with CSS transitions.

**Trade-offs**:

- More setup than pre-styled libraries
- Need to handle styling yourself
- Some components are complex

---

## Vite over Next.js / CRA

**Choice**: Vite (SPA)

**Why**:

1. **Fast** — ESM-based dev server. No bundling during development.

2. **Simple** — It's a build tool, not a framework. No magic.

3. **SPA is enough** — We have a separate API. Don't need SSR complexity.

4. **Great plugin ecosystem** — TanStack Router plugin, etc.

**When to use Next.js instead**:

- Need SSR for SEO
- Want API routes in the same project
- Need ISR/static generation

**Trade-offs**:

- No SSR (SEO relies on client rendering)
- Manual code splitting
- No built-in API routes

---

## File Organization

**Choice**: Feature-based, not type-based

```
src/
  routes/           # Pages (file-based routing)
  components/       # Shared UI components
  hooks/            # Shared hooks
  lib/              # Utilities, API client
  services/         # API service functions
  stores/           # Zustand stores
```

**Why not type-based** (components/, containers/, actions/):

- Features span multiple types
- Finding related code requires jumping directories
- Harder to delete features cleanly

**Within features**, colocate related code:

```
routes/
  posts.tsx            # Page component
  posts.api.ts         # API calls for this page
  posts.hooks.ts       # Hooks used by this page
  _components/         # Components only used here
    PostCard.tsx
    PostForm.tsx
```

---

## `queryOptions()` Factories over Inline Query Objects

**Choice**: Define query options in service files, not inline in components.

**Why**:

Defining a query inline in a component creates three problems:

1. You cannot use the same query in a route `loader` without duplicating the `queryKey` and `queryFn`.
2. The query key is scattered — invalidating it requires remembering the exact string used in the component.
3. It's harder to test; you'd need to render the component just to test the fetch logic.

`queryOptions()` solves all three:

```typescript
// services/auth.ts — one definition, used everywhere
export const sessionQueryOptions = queryOptions({
  queryKey: ["auth", "session"] as const,
  queryFn: () => authClient.getSession().then((r) => r.data ?? null),
  staleTime: 1000 * 60 * 5,
});

// In a route loader:
loader: ({ context: { queryClient } }) =>
  queryClient.ensureQueryData(sessionQueryOptions),

// In a component:
const session = Route.useLoaderData();

// When invalidating after a mutation:
queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey });
```

One object. All usages point to the same key, staleTime, and fetcher. Rename it and TypeScript catches every consumer.

**Trade-offs**:

- One more file to create per domain
- Pattern requires understanding TanStack Router's loader + context model

---

## `beforeLoad` for Auth Guards over Component-Level Redirects

**Choice**: Auth checks in `beforeLoad`, not inside the rendered component.

**Why**:

The old pattern — `useQuery` for session inside the component, then `navigate()` if null — has three problems:

1. **Flash of unauthenticated content**: The component renders (briefly showing the protected content or a loading spinner) before the redirect fires. With `beforeLoad`, the component never mounts if the guard fails.

2. **Dependent state management**: You need `isLoading` + `if (!session) return null` — two extra states the component has to manage.

3. **Escape from the component lifecycle**: Calling `navigate()` inside a `useEffect` or render is a side effect of the render phase, not a declarative description of what the route requires.

`beforeLoad` is a declarative contract: "this route requires a session." The router enforces it before the component touches the DOM.

```typescript
// ✗ Component-level guard — the old React Router mental model
function DashboardPage() {
  const { data: session, isLoading } = useQuery({ queryKey: ["session"], ... });
  if (isLoading) return <Spinner />;
  if (!session) { navigate({ to: "/login" }); return null; }
  return <div>{session.user.name}</div>;
}

// ✓ Router-level guard — declarative, no flash, no loading state
export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: "/login" });
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = Route.useRouteContext();
  if (!session) return null;  // Defensive — never reached
  return <div>{session.user.name}</div>;
}
```

The root route's `beforeLoad` fetches the session once and injects it into router context. All child routes read `context.session` without fetching again.

**Trade-offs**:

- Requires understanding TanStack Router's context model
- `context.session` is typed as `Session | null` even on protected routes (TS can't narrow through `throw redirect()`); requires a defensive null check

---

## Plain Fetch API over HTTP Client Libraries

**Choice**: `fetch` directly, wrapped in a thin `request()` function.

**Why**:

The browser's `fetch` API is a web standard. Libraries like `axios`, `ky`, and `got` add:
- Interceptors (you can do this with a wrapper function)
- Automatic retries (handle in `queryOptions.retry`)
- Request cancellation (use `AbortSignal` from the `loader` context)
- Error normalisation (our `ApiError` class does this)

None of these require a library. `fetch` supports all of them natively or via `@tanstack/react-query`'s built-in mechanisms.

The `api` object in `lib/api.ts` is a plain object of functions — not a class instance. This is intentionally simpler: no `new`, no `this`, tree-shakeable, testable by calling the functions directly.

**The shift**: `ApiError` is thrown for non-2xx responses and carries `status` and `body`. Callers check `instanceof ApiError` for specific status handling and fall back to a generic message otherwise. This replaces the opaque `Error("Request failed")` that an unmaintained class was throwing.

**Trade-offs**:

- No interceptors (add a wrapper if upload progress or auth headers become necessary)
- Manual `Content-Type` header (acceptable — all our API calls are JSON)

---

## No Global Auth State (Zustand/Context) — Use the Query Cache

**Choice**: Session state lives in the React Query cache (`["auth", "session"]`), not a Zustand store or React context.

**Why**:

A common pattern is to create a `useAuthStore` or `AuthContext` to hold the current user. This creates a redundant source of truth that can drift from the server state.

The query cache *is* the client-side state for server data. The session is server state. It:
- Has a known staleness (5 minutes)
- Must be re-fetched after mutations (signIn/signOut)
- Can be invalidated from anywhere via `queryClient.invalidateQueries`

Zustand is reserved for *UI state* — things with no server equivalent (sidebar open/closed, modal state, selected tab). Anything that has a server source lives in the React Query cache.

| State | Solution |
|---|---|
| Current user session | React Query `sessionQueryOptions` |
| Server resource (posts, users) | React Query `queryOptions` |
| Form state | TanStack Form |
| URL/navigation state | TanStack Router search params |
| UI-only state (modals, sidebar) | Zustand |

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
| Form state | React Hook Form |
| UI state (modals, sidebars) | Zustand |
| Component-local state | useState |

**Trade-offs**:

- Less structure (freedom can mean inconsistency)
- No time-travel debugging
- Manual devtools setup

---

## React Hook Form over Formik

**Choice**: React Hook Form + Zod

**Why**:

1. **Uncontrolled by default** — Doesn't re-render on every keystroke. Fast even with large forms.

2. **Zod integration** — Same schemas as backend. Validate once, use everywhere.

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

3. **Minimal re-renders** — Form state is ref-based. Only invalid fields re-render.

4. **Great DX** — `register` is magical. Spread and done.

```tsx
<input {...register("email")} />
{errors.email && <span>{errors.email.message}</span>}
```

5. **Composable** — Use with any UI library. No special form components.

**Trade-offs**:

- Uncontrolled model can be confusing
- Complex validation logic can get messy
- Less intuitive than controlled forms

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

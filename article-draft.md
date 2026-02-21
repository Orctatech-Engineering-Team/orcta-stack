# Boring by Design: The Full-Stack TypeScript Stack I Actually Ship With

Most "modern stack" posts are a list of logos.

Every choice below exists for the same reason: to make the next person reading this code — which is almost always future-me — less surprised. Surprise is the enemy. Predictability is the feature nobody thinks to put in a README.

The stack is a pnpm monorepo: Hono + Drizzle + BetterAuth on the backend, React + TanStack Router + Base UI on the frontend, a couple of shared packages tying it together. None of those choices are revolutionary. That's the point.

---

## The Monorepo Isn't the Hard Part

The hard part is agreeing on formatting.

I've lost more collective hours to ESLint plugin conflicts, Prettier disagreements, and `.eslintrc` archaeology than I care to admit. So this project has one tool for both: [Biome](https://biomejs.dev). One binary, one config file, configured in thirty seconds.

```json
{
  "formatter": {
    "indentStyle": "tab"
  },
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedVariables": "error" },
      "suspicious": { "noExplicitAny": "error" }
    }
  }
}
```

The tabs-vs-spaces debate ends here because I wrote it in a JSON key and we moved on.

The workspace itself is simple. `packages/db` owns the Drizzle schema and migrations — one place to change a column, zero places to argue about where it should live. `packages/shared` owns the things both apps need: the Result type, validation schemas, pagination utilities. `apps/backend` and `apps/frontend` import from those packages and do their jobs.

When you add a new backend module, a script handles the scaffolding:

```bash
./scripts/new-module.sh articles
```

That produces the handlers, routes, repository, and error files — each with the right imports already in place. Convention enforced by a script is better than convention enforced by a wiki nobody reads.

---

## Stop Throwing Errors

Here's the thing about `throw`: it's invisible. The function signature says `Promise<User>`, but what it means is "a User, or maybe a database exception, or maybe something I didn't think about." The caller has no idea unless they go read the implementation.

I stopped throwing in repository functions. Every function that can fail returns a `Result<T, E>` instead.

```typescript
export type Ok<T>  = { ok: true;  value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;
```

This isn't a new idea. Rust has it, Go has it in its own way, fp-ts made it fashionable in TypeScript. The difference here is that it's not a library — it's forty lines in `packages/shared/src/result.ts`, and we only use the parts that pull their weight.

There are libraries that do this for you. [`neverthrow`](https://github.com/supermacro/neverthrow) is the most popular — a well-designed `Result` implementation with a full combinator API and strong TypeScript support. [`Effect`](https://effect.website) goes much further: structured concurrency, dependency injection, tracing, a full alternative to the standard library. Both are serious pieces of work.

I didn't reach for either of them. `neverthrow` would have been fine, but rolling forty lines means there's nothing to upgrade, nothing to audit, and no new team member needs to learn an API before reading the code. `Effect` is genuinely impressive and genuinely large — it's a paradigm shift, not a library you drop in on a Friday. The learning curve is real, the ecosystem lock-in is real, and a project that started as a shipping vehicle for my own products can't be a bet on a team being fluent in Effect. If I were staffing a team of FP-literate engineers building something at scale, the calculus would be different. Here, the forty-line version does exactly what I need and no more.

### Three Layers, One Rule

Error handling in this codebase has a strict topology.

**Infrastructure errors** are things that shouldn't happen: the database is down, the connection pool is exhausted, the disk is full. They're not business logic. They're wrapped in a single `InfrastructureError` class and handled with one wrapper function:

```typescript
export async function tryInfra<T>(
  message: string,
  fn: () => Promise<T>,
): Promise<Result<T, InfrastructureError>> {
  try {
    return ok(await fn());
  } catch (cause) {
    return err(new InfrastructureError(message, cause));
  }
}
```

Every Drizzle call in the codebase goes through `tryInfra`. That's the only `try/catch` in the repository layer. There is no other place it's correct to put one.

**Domain errors** are expected outcomes. They're not bugs, they're business logic. A user that doesn't exist isn't a crash — it's a valid state the caller needs to handle. They live in a file next to the module they belong to:

```typescript
// users.errors.ts
export type UserNotFound  = { type: "USER_NOT_FOUND"; lookup: string };
export type EmailTaken    = { type: "EMAIL_TAKEN";    email: string };
export type EmailUnchanged = { type: "EMAIL_UNCHANGED"; email: string };
```

Each one carries exactly the data its handler needs. No generic `new Error("not found")` that strips the context the moment it crosses a function boundary.

**HTTP errors** are the handler's job. The handler reads the Result and maps it to a status code. The compiler makes sure you handle every branch:

```typescript
export const getMeHandler: AppRouteHandler<GetMeRoute> = async (c) => {
  const result = await findUserById(c.get("session").userId);

  return match(result, {
    ok: (user) => c.json(success(user), OK),
    err: (e) => {
      if (isInfraError(e))
        return c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), 500);

      switch (e.type) {
        case "USER_NOT_FOUND":
          return c.json(failure({ code: "NOT_FOUND", message: "User not found" }), 404);
      }
    },
  });
};
```

If you add a new error variant to `UserRepoError` and forget to handle it in the switch, TypeScript tells you before the PR merges. That's the contract.

### What this costs

Verbosity. A function that used to be `return db.query.users.findFirst(...)` is now a `tryInfra` call, a null check, and a typed return. It takes longer to write the first time.

The payback is that you never grep for "where does this 500 come from" again because the answer is always the same: `tryInfra`. You never wonder whether a repository function can throw because the type tells you it can't. That's a trade I make every time.

---

## Ditching Radix UI

I used Radix for two years. I know exactly what it can do and exactly where it starts to cost you.

Radix is excellent accessibility primitives. It is not a design system. The moment you try to own your own design tokens — real CSS custom properties that cascade the way the spec intended — Radix's portal-based components start fighting you. Dialog overlays stacking under elements. Tooltips inheriting the wrong background. `z-index` negotiations you have to win every time.

The fix is always the same: wrap the portal in a `style` tag, add a `zIndex` prop, add `--radix-*` variable overrides. It works. It's also four lines of boilerplate per component that exists because the library's model and yours don't fully agree.

[Base UI](https://base-ui.com) makes a different bet. It gives you unstyled primitives and gets out of the way. Two lines in `index.css` sort out the portal stacking:

```css
#root  { isolation: isolate; }
body   { position: relative; }
```

That's it. The components render into portals that respect the stacking context you defined, because you defined it the way the browser expects it.

The component itself is just your styles wrapped around Base UI's logic:

```tsx
import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default:  "bg-(--color-primary) text-(--color-primary-foreground)",
        outline:  "border border-border bg-(--color-background)",
        ghost:    "hover:bg-(--color-accent)",
        // ...
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-11 px-8",
      },
    },
  }
);

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <BaseButton
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

CVA handles the variant composition. Base UI handles the accessibility — focus management, `aria-*` attributes, keyboard interactions, `data-disabled` state. Your CSS handles everything visual. None of these three concerns know about each other, and that's exactly how it should be.

### What you lose

Radix has a bigger ecosystem. If you're reaching for a Date Picker or a Combobox, Radix has community solutions and Base UI (as of early 2026) is still filling out its component set. If your UI needs those primitives right now, the tradeoff calculus changes.

For the components that do exist — Button, Dialog, Tooltip, Popover, Select, the ones you actually use in 90% of UIs — Base UI is cleaner to work with and easier to reason about.

---

## The Part Nobody Talks About

All of this only matters if it stays consistent.

The Result type is useless if one repository throws and another returns. The component library is useless if some pages use it and others reach for raw `<button>` tags. The Biome config is useless if it's not enforced on commit.

The shell script isn't just a convenience — it scaffolds files that already follow the pattern, with the right imports, the right structure, the right error file next to the right handler. The first time a new module is created it looks like every other module, because it was generated from the same template.

Consistency is a tooling problem so solve it with tools.

---

## What I'd Change

The one thing I'd do differently: the `match` + `switch` pattern in handlers is repetitive in exactly the cases where there are multiple repository calls. The `andThenAsync` combinator in `result.ts` helps, but the error union grows quickly and the handler still ends up with a long switch.

Going further with use-case functions — pushing more of the multi-step logic out of the handler and into a pure function that returns a single typed error — would clean that up. It's the direction the codebase is already heading.

---

The repo is [on GitHub](https://github.com/Orctatech-Engineering-Team/orcta-stack) if you want to read the full source. The code in this post is real — pulled directly from the working implementation, not cleaned up for the article.

If you've been burned by the same things — formatting wars, mystery 500s, z-index fights with your component library — I hope this gives you something concrete to reach for.

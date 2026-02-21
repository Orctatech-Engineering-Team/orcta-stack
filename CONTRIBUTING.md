# Contributing

Thanks for helping out. Here's how to do it well.

Before diving in, read [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md) — the beliefs behind every decision in this codebase. The workflow below will make more sense once you understand the *why*.

If you're working with an AI agent on this project, also read [`AGENTS.md`](AGENTS.md).

---

## Setup

This is a GitHub template repo. You already have your own copy.

```bash
pnpm setup        # Install dependencies + generate .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

Backend on [localhost:9999/docs](http://localhost:9999/docs). Frontend on [localhost:5173](http://localhost:5173).

---

## The Workflow

### 1. Start from the right branch

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

Never work directly on `main` or `dev`. Every change gets its own branch.

| Type | Branch pattern |
|------|----------------|
| New feature | `feature/<name>` |
| Bug fix | `fix/<name>` |
| Refactor | `refactor/<name>` |
| Chore / deps | `chore/<name>` |
| Docs | `docs/<name>` |

### 2. Build one thing

A feature, a fix, a refactor — not all three at once. If you notice something adjacent that needs fixing, note it and address it separately. Mixing concerns makes every change harder to review, harder to revert, and harder to understand later.

For anything non-trivial: think through the approach before writing code. A five-minute outline is faster than a misdirected hour of implementation.

### 3. Write tests with the code

Tests are part of the feature, not something you add at the end. Before you commit:

```bash
pnpm test        # All tests
pnpm typecheck   # TypeScript
pnpm lint        # Biome
```

CI runs these on every PR. It will catch it — fix it locally first.

### 4. Commit with intention

Conventional commits:

```
<type>(<scope>): <what changed>

<why it changed, if not obvious>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`  
Scopes: `backend`, `frontend`, `shared`, `db`, `auth`, `jobs`, `scripts`

```bash
# Good
git commit -m "feat(backend): add pagination to posts endpoint"
git commit -m "fix(auth): handle expired refresh token on re-login"

# Bad
git commit -m "fixed stuff"
git commit -m "wip"
git commit -m "added the feature and also fixed a bug and updated docs"
```

If the message needs "and" to describe it, it's probably two commits.

### 5. Open a PR

PR per coherent unit. Not per day, not per session. One change, one PR.

Keep it reviewable in under 30 minutes. A 1000-line diff is probably two PRs.

Use this template:

```md
## What
Brief description. One to three sentences.

## Why
The user problem or technical need. Link to issue if one exists.

## How
Key decisions made. What alternatives were considered.

## Testing
How to verify this works. Specific steps.

## Notes
Technical debt introduced. Follow-up work needed. Anything a reviewer should know.
```

### 6. Address review feedback

Respond to all comments within 24 hours — even a simple "done" or "disagree because X". If you disagree, explain why. Reviews are collaborative, not adversarial.

Mark conversations as resolved when addressed. Request re-review when ready.

### 7. After merging

Monitor your changes in production for at least an hour. Delete the feature branch. Close related issues.

---

## Code Style

### Backend

- **Errors are values.** Use-cases and repositories return `Result<T, E>` — never throw. See [`apps/backend/docs/DECISIONS.md`](apps/backend/docs/DECISIONS.md).
- **Handlers are thin.** They read input, call the repository or use-case, map the Result to HTTP. No business logic in handlers.
- **Infrastructure has one catch boundary.** All DB/Redis calls go through `tryInfra`. That's the only `try/catch` in repository code.

```typescript
// Good
const result = await findUserById(id);
return match(result, {
  ok:  (user) => c.json(success(user), 200),
  err: (e)    => c.json(failure({ code: "NOT_FOUND" }), 404),
});

// Bad
try {
  const user = await db.query.users.findFirst(...);
  return c.json(user, 200);
} catch (e) {
  return c.json({ error: "unknown" }, 500);
}
```

### Frontend

- **Server state lives in React Query.** UI state lives in Zustand. Don't create a context for server data.
- **Auth guards go in `beforeLoad`**, not inside the component. No flash of unauthenticated content.
- **Components wrap Base UI primitives.** Style with design tokens (`--color-primary`, etc.) not hardcoded Tailwind colors.

### General

- No `any`. Configure a `biome-ignore` comment with a reason if you absolutely need one.
- Name things clearly. `getUserById` not `get` or `fetchData`.
- Delete dead code. Don't comment it out.
- Leave the codebase better than you found it — but save it for its own commit.

---

## Adding Things

### A backend module

```bash
pnpm new:module posts
```

Then register in `apps/backend/src/routes/index.ts`. See the [README](README.md) for the full walkthrough.

### A database table

```bash
# Edit packages/db/src/schema/your-table.ts
pnpm db:generate   # Generates migration
pnpm db:migrate    # Applies it
```

### A Better Auth plugin

```bash
npx @better-auth/cli generate   # Updates schema from auth config
pnpm db:generate
pnpm db:migrate
```

### A frontend page

Create `apps/frontend/src/routes/your-page.tsx`. TanStack Router picks it up automatically.

---

## What Good Work Looks Like

You're done with a unit when:

- It works as intended
- Tests cover the new behavior
- Lint and typecheck pass
- The commit message describes what and why
- A stranger could understand the PR in five minutes

Finish what you start. Shipping three complete things beats ten half-done ones every time.

---

## Questions?

Ask in the internal chat or ping a tech lead directly.

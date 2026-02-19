# Contributing

Thanks for helping out. Here's how to do it well.

---

## Setup

```bash
git clone <repo>
cd orcta-stack
pnpm setup
docker compose up -d
pnpm db:migrate
pnpm dev
```

---

## Before You Commit

```bash
pnpm lint        # Fix style issues
pnpm typecheck   # Catch type errors
pnpm test        # Run tests
```

CI runs these on every PR. Save yourself a round trip.

---

## Code Style

### Backend

- **Use discriminated unions** for use-case results. No exceptions for control flow.
- **Inject dependencies** into use-cases. No direct imports of db/repos.
- **Keep handlers thin.** They map HTTP ↔ use-cases, nothing more.

```typescript
// Good
const result = await createUserUseCase(deps, input);
switch (result.type) { ... }

// Bad
try {
  const user = await createUser(input);
} catch (e) { ... }
```

### Frontend

- **One component per file.** Named exports.
- **Colocate related code.** Keep hooks near the components that use them.
- **Use React Query** for server state. Zustand for UI state.

### General

- No `any`. Ever.
- Name things clearly. `getUserById` not `get` or `fetchData`.
- Delete dead code. Don't comment it out.

---

## Commit Messages

Be specific. Say what changed and why.

```
# Good
fix(auth): handle expired refresh tokens

# Bad
fix bug
update code
```

---

## Pull Requests

1. Keep them small. One feature or fix per PR.
2. Write a clear description. What does this do? Why?
3. Update docs if you change behavior.
4. Add tests for new features.

---

## Adding a Feature

1. **Backend module**: `pnpm new:module <name>`
2. **Database table**: Add schema to `packages/db/src/schema/`
3. **Frontend page**: Create file in `apps/frontend/src/routes/`

---

## Questions?

Open an issue. We'll help.

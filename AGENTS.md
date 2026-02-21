# AGENTS.md

Instructions for AI agents working in this codebase. Read this before touching anything.

Also read: [`CLAUDE.md`](CLAUDE.md) for commands and architecture, [`docs/WRITING.md`](docs/WRITING.md) for documentation voice, [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md) for the beliefs behind every decision.

---

## Philosophy

This codebase follows a simple principle: **simple is not easy, but it's the only thing that scales**.

We take inspiration from 37signals, DHH, Jason Fried, and the Primeagen. Bias toward the boring solution. Complexity is a cost you pay with every future change. Don't add indirection that doesn't earn its keep. Don't build for hypothetical requirements. Don't make ten changes when one would do.

The four principles — **principles over tools**, **progressive abstraction**, **craftsmanship**, **human experience first** — are documented in full in [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md). Read it once. It's the question to ask before you add anything.

---

## The Core Rule: Work in Coherent Units

A coherent unit is one logical change with a clear boundary. It has a name. It could be described in a single sentence. It has tests. It gets a commit. If it's non-trivial, it gets a branch and a PR.

**A coherent unit is:**

- A new feature (`feat`)
- A bug fix (`fix`)
- A refactor that doesn't change behavior (`refactor`)
- A dependency update + any required code changes (`chore`)
- A documentation improvement (`docs`)

**A coherent unit is NOT:**

- A feature + an unrelated test fix + a renamed variable
- "All the things I noticed while looking at the file"
- Every change across the entire repo triggered by one small ask

When you find something adjacent that needs fixing, note it. Finish the current unit. Then address it separately.

---

## Branching

Never commit directly to `main` or `dev` for anything beyond a typo fix. New work = new branch.

```bash
git checkout dev
git pull origin dev
git checkout -b <type>/<short-description>
```

Branch naming:

| Type | Pattern | Example |
|------|---------|---------|
| New feature | `feature/<name>` | `feature/post-pagination` |
| Bug fix | `fix/<name>` | `fix/session-cookie-expiry` |
| Refactor | `refactor/<name>` | `refactor/error-handler-cleanup` |
| Chore | `chore/<name>` | `chore/update-drizzle` |
| Documentation | `docs/<name>` | `docs/better-auth-schema` |

One branch = one coherent unit. Don't accumulate unrelated changes on a branch because they happen to be open at the same time.

---

## Commits

Conventional commits. Always.

```
<type>(<scope>): <what changed>

<why it changed, if not obvious>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`

Scopes: `backend`, `frontend`, `shared`, `db`, `auth`, `jobs`, `scripts`, `deps`

**Good:**

```
feat(backend): add pagination to the posts list endpoint

Adds paginationQuery schema and paginate() helper from packages/shared.
Consistent with users list — same offset/limit convention.
```

**Bad:**

```
update stuff
fixed some things and also added the new feature and updated docs
wip
```

Commit size: one concern per commit. If the message needs "and", it's probably two commits. If the diff spans five unrelated files, stop and ask what the actual unit is.

Keep commits logical even on a feature branch — they tell the story of how you got there.

---

## Testing

Tests are part of the work unit, not an afterthought.

- Write or update tests **before committing** — don't leave a commit that breaks the suite
- For new backend modules: at minimum, a scaffolded `handlers.test.ts` with the first test passing
- For logic that branches: test every branch
- For bug fixes: write the test that would have caught it first, then fix it

```bash
pnpm test          # All tests
pnpm typecheck     # TypeScript
pnpm lint          # Biome
```

All three must pass before you commit. CI will catch it anyway — save the round trip.

---

## Pull Requests

PR per coherent unit. Not per day. Not "everything I did this session". One unit, one PR.

**Before opening a PR:**

- [ ] All tests pass (`pnpm test`)
- [ ] No type errors (`pnpm typecheck`)
- [ ] No lint warnings (`pnpm lint`)
- [ ] Branch is rebased on latest `dev`
- [ ] Commit history tells a legible story

**PR description must include:**

```md
## What
Brief description of the change. One to three sentences.

## Why
The user problem or technical need this solves. Link to issue if one exists.

## How
Key architectural or implementation decisions. What alternatives were considered.

## Testing
How to verify this works. Specific steps, not "it works".

## Notes
Anything a reviewer should know. Technical debt introduced. Follow-up work needed.
```

PR size: reviewable in under 30 minutes. If the diff is 1000+ lines, it's probably two PRs. Split by layer or by phase of the work.

---

## Scope Discipline

These are the failure modes to actively avoid:

**Don't batch unrelated changes.** If you're asked to add pagination to the posts endpoint, don't also fix the users handler, rename a variable you noticed, and update three docs files. Do the thing asked. Commit it. Note the rest.

**Don't refactor while adding a feature.** If the existing code is messy, open a refactor PR first, then build the feature on top of clean ground. Mixing the two makes both harder to review and harder to revert.

**Don't create summary documents.** Don't create a `CHANGES.md`, `SUMMARY.md`, or `TODO.md` unless explicitly asked. If you need to track state across a long task, use the task list in your head or ask the user.

**Don't touch files you weren't asked to touch** unless they're directly load-bearing for the change. Noticing something is not the same as being asked to fix it.

**Don't leave the codebase in a half-done state.** A partially implemented feature is worse than no feature — it creates confusion and merge conflicts. Either complete the unit or don't start it. If something is larger than expected, surface that before diving in.

---

## Code Patterns

The patterns are documented; use them. Don't invent new ones without documenting them.

**Error handling:** every function that can fail returns `Result<T, E>`. No `throw` in repository or use-case code. Infrastructure catches go through `tryInfra`. Domain errors are typed discriminated unions in `*.errors.ts`. See [`apps/backend/docs/DECISIONS.md`](apps/backend/docs/DECISIONS.md).

**Module structure:** use the scaffolder. `pnpm new:module <name>` generates the correct file layout. The pattern is: route → handler → repository → error types → use-cases. See [`apps/backend/docs/ARCHITECTURE.md`](apps/backend/docs/ARCHITECTURE.md).

**Frontend components:** Base UI primitives wrapped with CVA variants. Design tokens from CSS custom properties (`--color-primary`, etc.). No hardcoded `gray-*` Tailwind classes. See [`apps/frontend/docs/DECISIONS.md`](apps/frontend/docs/DECISIONS.md).

**Adding a Better Auth plugin:** run schema generation before migrating. See the Better Auth section in [`apps/backend/docs/DECISIONS.md`](apps/backend/docs/DECISIONS.md).

---

## What Good Work Looks Like

You're done with a unit when:

1. The feature, fix, or refactor works as intended
2. Tests cover the new behavior
3. Lint and typecheck pass
4. The commit message describes what changed and why
5. The branch is clean and rebased
6. The PR description would let a stranger understand the change in five minutes

Quality is not completeness. Shipping ten half-finished things is worse than shipping three finished ones. Finish what you start. Leave the codebase better than you found it.

---

## Reference

- [Engineering Philosophy](https://adjanour.github.io/docs-site/engineering/engineering-philosophy/) — principles that anchor all decisions
- [Engineering Playbook](https://adjanour.github.io/docs-site/engineering/engineering-playbook/) — practices and rituals
- [Git Workflow](https://adjanour.github.io/docs-site/engineering/git-workflow/) — branching and commit conventions
- [PR Guidelines](https://adjanour.github.io/docs-site/engineering/pr-guidelines/) — what a good PR looks like
- [Orcta Workflow](https://docs.orctatech.com/orcta-workflow.html) — end-to-end development workflow

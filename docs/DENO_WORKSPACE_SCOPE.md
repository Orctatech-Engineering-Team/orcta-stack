# Deno Workspace Migration Scope

Current architecture: flat root `deno.json` with a global import map that
resolves `@repo/*`, `@/*`, and all `npm:` dependencies. This works, but
per-package config is crowded into one file.

Goal: use Deno's native workspace system so each package is self-describing.

---

## Current State

```
deno.json (root)           ← 40+ import map entries, 10 tasks, lint/fmt/test config
├── apps/
│   ├── backend/           ← 20 @/ imports + 10 @repo/ imports from root deno.json
│   └── frontend/          ← pnpm only, no @repo imports in source
├── packages/
│   ├── shared/            ← package.json only, no deno.json; 3 source files, 2 test files
│   ├── db/                ← package.json only, no deno.json; schema dir, no tests
│   └── email-templates/   ← package.json only, no deno.json; 1 source, 1 test file
├── package.json           ← pnpm root
└── pnpm-workspace.yaml    ← MISSING (but frontend package.json has workspace:* deps)
```

### Dependency graph

```
apps/backend
  └── @repo/shared     (20 import sites across handlers, repos, use-cases)
  └── @repo/db         (7 import sites, mostly @repo/db/schema)
  └── @repo/email-templates  (not yet imported — future)

packages/db
  └── drizzle-orm, postgres    (npm: deps, currently in root import map)

packages/shared — zero external deps, pure TypeScript
packages/email-templates — zero external deps, pure TypeScript

apps/frontend
  └── @repo/shared (package.json dep, NOT imported in source)
  └── @repo/db     (package.json dep, NOT imported in source)
```

---

## Target State

### Root `deno.json`

```json
{
  "workspace": [
    "apps/backend",
    "packages/shared",
    "packages/db",
    "packages/email-templates"
  ],
  "tasks": {
    "dev": "deno task --cwd=apps/backend dev",
    "dev:frontend": "deno run -A npm:vite dev --config apps/frontend/vite.config.ts",
    "check": "deno check",
    "lint": "deno lint",
    "fmt": "deno fmt"
  },
  "imports": {
    "@std/expect": "jsr:@std/expect@^1.0.19",
    "@std/testing/bdd": "jsr:@std/testing@^1.0.18/bdd"
  },
  "nodeModulesDir": "auto",
  "sloppyImports": true
}
```

Root owns: workspace membership, shared dev/test deps, top-level convenience
tasks. No npm runtime deps, no `@repo/*` entries, no `@/*` aliases.

### `packages/shared/deno.json` — NEW

```json
{
  "name": "@repo/shared",
  "version": "0.1.0",
  "exports": "./src/index.ts",
  "exclude": ["node_modules"]
}
```

Zero external deps — pure TypeScript. The `name` field lets Deno resolve
`@repo/shared` as a bare specifier via workspace resolution, replacing the root
import map entry.

### `packages/db/deno.json` — NEW

```json
{
  "name": "@repo/db",
  "version": "0.1.0",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "imports": {
    "drizzle-orm": "npm:drizzle-orm",
    "drizzle-orm/pg-core": "npm:drizzle-orm/pg-core",
    "drizzle-orm/postgres-js": "npm:drizzle-orm/postgres-js",
    "postgres": "npm:postgres"
  },
  "exclude": ["node_modules"]
}
```

The `exports` with sub-path `./schema` preserves `@repo/db/schema` imports
without needing a root import map entry.

### `packages/email-templates/deno.json` — NEW

```json
{
  "name": "@repo/email-templates",
  "version": "0.1.0",
  "exports": "./src/index.ts",
  "exclude": ["node_modules"]
}
```

### `apps/backend/deno.json` — MOVE + EXPAND

```json
{
  "tasks": {
    "dev": "deno run --watch --env-file=.env -A src/index.ts",
    "start": "deno run --env-file=.env -A src/index.ts",
    "test": "deno test --env-file=.env -A",
    "db:migrate": "deno run --env-file=.env --allow-env --allow-net --allow-read --allow-sys src/db/migrate.ts",
    "db:studio": "deno run --env-file=.env -A npm:drizzle-kit studio",
    "db:generate": "deno run --env-file=.env -A npm:drizzle-kit generate"
  },
  "imports": {
    "@/": "./src/",
    "@/app": "./src/app.ts",
    "@/db": "./src/db/index.ts",
    "@/env": "./src/env.ts",
    "@/lib/auth": "./src/lib/auth.ts",
    "@/lib/create-app": "./src/lib/create-app.ts",
    "@/lib/configure-open-api": "./src/lib/configure-open-api.ts",
    "@/lib/types": "./src/lib/types.ts",
    "@/lib/redis": "./src/lib/redis.ts",
    "@/lib/error": "./src/lib/error.ts",
    "@/lib/infra": "./src/lib/infra.ts",
    "@/lib/cache": "./src/lib/cache.ts",
    "@/lib/storage": "./src/lib/storage.ts",
    "@/lib/rate-limit": "./src/lib/rate-limit.ts",
    "@/lib/ws": "./src/lib/ws.ts",
    "@/lib/http-status-codes": "./src/lib/http-status-codes.ts",
    "@/lib/http-status-phrases": "./src/lib/http-status-phrases.ts",
    "@/middlewares/auth": "./src/middlewares/auth.ts",
    "@/middlewares/wide-event": "./src/middlewares/wide-event.ts",
    "@/modules/health": "./src/modules/health/index.ts",
    "@/modules/health/handlers": "./src/modules/health/handlers.ts",
    "@/modules/health/routes": "./src/modules/health/routes.ts",
    "@/modules/users": "./src/modules/users/index.ts",
    "@/modules/users/handlers": "./src/modules/users/handlers.ts",
    "@/modules/users/routes": "./src/modules/users/routes.ts",
    "@/modules/users/users.repository": "./src/modules/users/users.repository.ts",
    "@/modules/users/users.errors": "./src/modules/users/users.errors.ts",
    "@/modules/users/users.usecases": "./src/modules/users/users.usecases.ts",
    "@/jobs/index": "./src/jobs/index.ts",
    "@/jobs/worker": "./src/jobs/worker.ts",
    "hono": "npm:hono",
    "hono/cors": "npm:hono/cors",
    "hono/dev": "npm:hono/dev",
    "hono/ws": "npm:hono/ws",
    "@hono/zod-openapi": "npm:@hono/zod-openapi",
    "@hono/swagger-ui": "npm:@hono/swagger-ui",
    "@hono/zod-validator": "npm:@hono/zod-validator",
    "@scalar/hono-api-reference": "npm:@scalar/hono-api-reference",
    "better-auth": "npm:better-auth",
    "better-auth/adapters": "npm:better-auth/adapters",
    "better-auth/plugins": "npm:better-auth/plugins",
    "ioredis": "npm:ioredis",
    "bullmq": "npm:bullmq",
    "pino": "npm:pino",
    "pino-pretty": "npm:pino-pretty",
    "hono-pino": "npm:hono-pino",
    "stoker": "npm:stoker",
    "stoker/middlewares": "npm:stoker/middlewares",
    "stoker/openapi": "npm:stoker/openapi",
    "@aws-sdk/client-s3": "npm:@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner": "npm:@aws-sdk/s3-request-presigner",
    "zod": "npm:zod",
    "drizzle-zod": "npm:drizzle-zod",
    "resend": "npm:resend",
    "dotenv": "npm:dotenv",
    "dotenv-expand": "npm:dotenv-expand",
    "@axiomhq/pino": "npm:@axiomhq/pino"
  },
  "lint": {
    "rules": {
      "exclude": ["no-explicit-any", "no-non-null-assertion"]
    }
  },
  "test": {
    "include": ["src/**/*.test.ts"]
  }
}
```

No `@repo/*` entries — those resolve through workspace bare specifiers. No
`drizzle-kit` import — that's a CLI tool, used via `npx` or
`deno run -A npm:drizzle-kit`.

---

## Steps

### Step 1 — Add `deno.json` to each workspace member

Create 4 files:

- `packages/shared/deno.json`
- `packages/db/deno.json`
- `packages/email-templates/deno.json`
- `apps/backend/deno.json` (migrate from root)

**Risk**: low. Adding config files is additive — nothing breaks yet.

### Step 2 — Update root `deno.json`

Add `"workspace"` field, strip `@repo/*` and `/*` entries from `imports`, move
lint/fmt/test config to member files, strip backend tasks.

**Risk**: medium. If workspace resolution doesn't kick in correctly,
`deno check` and `deno test` will fail with module-not-found errors.

### Step 3 — Verify `deno check` across all members

```bash
deno check
```

This should type-check all workspace members. If a member has type errors (e.g.
`packages/db` importing `drizzle-orm` but not declaring it in its own
`imports`), fix per-member config.

### Step 4 — Verify `deno test` across all members

```bash
deno test -A
```

Tests in `apps/backend`, `packages/shared`, `packages/email-templates` should
all run with per-member test configs.

### Step 5 — Clean up orphaned files

- Remove `packages/shared/vitest.config.ts` (Deno doesn't use it)
- Remove `packages/email-templates/vitest.config.ts`
- Remove `apps/backend/vitest.config.ts` (if it exists)
- Remove `apps/backend/package.json` — it only says `"type": "module"` which
  Deno doesn't need (Deno treats `.ts` as ESM by default, `.js` inherits from
  nearest `package.json` — but there's no `package.json` with `"type": "module"`
  for Deno paths anymore)
  - **BUT**: keep it if `npm:@better-auth/cli generate` or `drizzle-kit` needs
    it to detect ESM
- Remove `apps/backend/tsconfig.json`, `packages/*/tsconfig.json` (orphaned from
  old TypeScript setup)

### Step 6 — Recreate `pnpm-workspace.yaml`

If it was deleted, recreate it. Without it, `pnpm install` can't resolve
`workspace:*` protocol in the frontend's `package.json`.

```yaml
packages:
  - "packages/*"
```

The frontend's `package.json` lists `@repo/shared` and `@repo/db` as workspace
dependencies but never imports them in source. Optionally remove those unused
deps from `apps/frontend/package.json` — simplifies the pnpm workspace and
eliminates the dependency entirely.

### Step 7 — Update scripts

- `scripts/new-module.sh`: the scaffolded `handlers.test.ts` already uses
  `@std/testing/bdd`, so no change needed for tests. Still references
  `biome.json` for formatting — keep since Biome is still used for frontend.
- `scripts/setup.sh`: already updated for Deno.

### Step 8 — Update root `package.json`

Remove `"engines": { "deno": ">=2.0.0" }` — Deno doesn't read `engines` from
`package.json`. Keep the `"packageManager"` field for pnpm.

---

## Edge cases & risks

### 1. Module resolution order

Deno resolves bare specifiers in this order (workspace members → import map →
npm):

1. Check if specifier matches a workspace member's `name`
2. Check the local `deno.json` `imports`
3. Check the root `deno.json` `imports`

So `apps/backend` can still use `@repo/shared` even if it's not in anyone's
`imports` — it resolves through step 1 (workspace member name). **This is the
core mechanism** that lets us remove `@repo/*` from the root import map.

### 2. Duplicate npm import declarations

Both `packages/db` and `apps/backend` import `drizzle-orm` in their own
`deno.json`. Deno should deduplicate these to a single npm install. Verify with
`deno info` after the migration.

### 3. Backend `package.json` removal

The backend `package.json` is minimal
(`{"name": "backend", "type": "module", "private": true}`). It exists solely for
the pnpm workspace (so `pnpm -r` finds it) and for `type: "module"` (so
Node-based tools like drizzle-kit detect ESM).

**If we keep it**: no change needed. It's inert for Deno. **If we remove it**:
`npm:@better-auth/cli generate` might fail if it probes `type` from
`package.json`. The safe call is to keep it.

### 4. `pnpm-workspace.yaml` status

Currently missing. The frontend `package.json` lists
`"@repo/shared": "workspace:*"` and `"@repo/db": "workspace:*"` but never
imports them in source code. Two options:

- **Keep deps + recreate yaml**: simplest, no code changes
- **Remove unused deps**: cleaner but requires verifying nothing at build time
  depends on them (better-auth might resolve types through them)

### 5. `deno check` on member packages

`packages/shared` and `packages/email-templates` are pure TypeScript with zero
deps. `deno check` should pass instantly.

`packages/db` depends on `drizzle-orm` and `postgres`. If these npm packages
don't have Deno-compatible type declarations, `deno check` might fail. The
current root import map already has these entries, so they're already working —
moving them to `packages/db/deno.json` shouldn't change resolution.

`apps/backend` has the most complex dep graph. Moving its imports out of root
scope and into its own `deno.json` should be transparent since workspace member
imports take priority.

### 6. LSP behavior

With per-package `deno.json` files, VS Code's Deno LSP should correctly resolve
imports within each workspace member using that member's config. This is the
main UX improvement over the flat approach.

---

## Summary

| Item                              | Effort         | Risk           |
| --------------------------------- | -------------- | -------------- |
| Create 4 `deno.json` files        | Small          | Low            |
| Restructure root `deno.json`      | Medium         | Medium         |
| Remove orphaned config files      | Small          | Low            |
| Recreate `pnpm-workspace.yaml`    | Trivial        | Low            |
| Verify `deno check` + `deno test` | Medium         | Medium         |
| **Total**                         | **~2-3 hours** | **Low-Medium** |

The migration is straightforward: add `deno.json` to each package, strip them
from the root, verify resolution. The risk is in edge cases (npm type
declarations, pnpm workspace sync, LSP cache invalidation).

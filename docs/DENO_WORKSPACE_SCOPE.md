# Deno Workspace Architecture

The monorepo uses Deno's native workspace system. Each package is
self-describing with its own `deno.json`, and bare specifiers like `@repo/shared`
resolve through workspace member names — no global import map entries needed.

---

## Why

A flat root `deno.json` with all imports works, but doesn't scale. Every package
change touches the same file, per-package concerns are mingled, and the LSP
can't scope imports to the correct context. Workspaces give us:

- **Self-describing packages** — each `deno.json` declares its own deps
- **Bare specifier resolution** — `@repo/shared` resolves from workspace member
  `name`, not an import map entry
- **LSP accuracy** — per-package config means the editor resolves imports per
  context
- **Progressive abstraction** — packages can escalate from no config to full
  config as they grow

---

## Current State

```
deno.json (root)
  workspace: [apps/backend, apps/frontend, packages/shared, packages/db, packages/email-templates]
  tasks: dev, dev:frontend, dev:backend, start, worker, test, lint, fmt, check, db:*
  imports: @std/expect, @std/testing/bdd  (shared dev/test deps only)
  nodeModulesDir: auto
  sloppyImports: true
  ├── apps/
  │   ├── backend/     deno.json — 40+ import map entries (npm: + @/* aliases)
  │   └── frontend/    deno.json — @/ import map, vite tasks (consumer only, no name)
  └── packages/
      ├── shared/            deno.json — name @repo/shared, pure TS, zero npm deps
      ├── db/                deno.json — name @repo/db, exports ./ and ./schema
      └── email-templates/   deno.json — name @repo/email-templates, zero npm deps
```

### Dependency graph

```
apps/backend
  └── @repo/shared     (20+ import sites)
  └── @repo/db         (7 import sites, mostly @repo/db/schema)
  └── @repo/email-templates

packages/db
  └── drizzle-orm, postgres, drizzle-zod    (npm: in its own imports)

packages/shared — zero external deps, pure TypeScript
packages/email-templates — zero external deps, pure TypeScript

apps/frontend — consumer only (Vite/browser), not imported by anything else
```

---

## Config Files

### Root `deno.json`

```json
{
  "workspace": [
    "apps/backend",
    "apps/frontend",
    "packages/shared",
    "packages/db",
    "packages/email-templates"
  ],
  "tasks": {
    "dev": "deno task --cwd=apps/backend dev",
    "dev:backend": "deno task --cwd=apps/backend dev",
    "dev:frontend": "deno task --cwd=apps/frontend dev",
    "start": "deno task --cwd=apps/backend start",
    "worker": "deno task --cwd=apps/backend worker",
    "test": "deno task --cwd=apps/backend test",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "check": "deno check apps/backend/src/index.ts apps/backend/src/jobs/worker.ts",
    "db:migrate": "deno task --cwd=apps/backend db:migrate",
    "db:studio": "deno task --cwd=apps/backend db:studio",
    "db:generate": "deno task --cwd=apps/backend db:generate"
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

### `apps/backend/deno.json`

Owns: all npm runtime deps, all `@/*` path aliases, tasks for dev/test/DB, lint
and test config.

No `@repo/*` entries — those resolve through workspace bare specifiers. No
`nodeModulesDir` — that's a root-level concern per Deno docs.

### `apps/frontend/deno.json`

Consumer member only. Has `@/*` import map for Vite/React imports. No `name` or
`exports` — nothing imports the frontend. Uses `deno run -A npm:vite` for dev
and build tasks.

### `packages/shared/deno.json`

```json
{
  "name": "@repo/shared",
  "version": "0.1.0",
  "exports": "./src/index.ts",
  "exclude": ["node_modules"]
}
```

Zero external deps — pure TypeScript. The `name` field lets Deno resolve
`@repo/shared` as a bare specifier via workspace resolution.

### `packages/db/deno.json`

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
    "drizzle-zod": "npm:drizzle-zod",
    "postgres": "npm:postgres",
    "dotenv": "npm:dotenv",
    "drizzle-kit": "npm:drizzle-kit"
  },
  "exclude": ["node_modules"]
}
```

The `exports` with sub-path `./schema` preserves `@repo/db/schema` imports
without needing a root import map entry.

### `packages/email-templates/deno.json`

```json
{
  "name": "@repo/email-templates",
  "version": "0.1.0",
  "exports": "./src/index.ts",
  "exclude": ["node_modules"]
}
```

Zero external deps.

---

## Module Resolution Order

Deno resolves bare specifiers in this order:

1. Check if specifier matches a workspace member's `name`
2. Check the local `deno.json` `imports`
3. Check the root `deno.json` `imports`

So `apps/backend` imports `@repo/shared` and it resolves through step 1
(workspace member name). No import map entry needed. This is the core mechanism
that lets us keep the root `imports` clean.

---

## Edge Cases

### 1. All members must exist

If root has a `"workspace"` array, ANY `deno.json` under the root directory MUST
be a workspace member. The `"exclude"` field only affects `deno fmt`/`deno
lint`/`deno test`, NOT workspace validation. This means the Dockerfile for the
backend must copy stub `deno.json` files for all members before `deno cache`
runs.

### 2. `nodeModulesDir` placement

Per Deno docs, `nodeModulesDir` is only valid at the workspace root level (OK in
root, rejected in member configs). It lives in root `deno.json` only.

### 3. Duplicate npm import declarations

Both `packages/db` and `apps/backend` import `drizzle-orm` in their own
`deno.json`. Deno deduplicates these to a single npm install.

### 4. Frontend is a consumer-only member

The frontend `deno.json` has no `name` or `exports`. It needs to be a workspace
member (to pass validation) but isn't imported by anything. The Docker build
copies its `deno.json` as a stub.

### 5. pnpm workspace

The frontend's `package.json` still uses pnpm for dependency management (Vite,
React, etc.). The Deno workspace and pnpm workspace coexist — Deno handles the
backend and packages, pnpm handles the frontend's npm deps. The `package.json`
has been cleaned up: no `@repo/*` workspace deps (those are resolved via Deno
workspace now).

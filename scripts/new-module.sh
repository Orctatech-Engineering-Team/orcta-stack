#!/usr/bin/env bash
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────────────────
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

info()    { echo -e "${CYAN}ℹ${RESET}  $*"; }
success() { echo -e "${GREEN}✓${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✗${RESET}  $*" >&2; }

# ── Usage ───────────────────────────────────────────────────────────────────────
if [[ $# -eq 0 || "$1" == "--help" || "$1" == "-h" ]]; then
  echo "Usage: ./scripts/new-module.sh <module-name>"
  echo "       module-name must be lowercase letters, digits, or hyphens"
  echo "Example: ./scripts/new-module.sh posts"
  exit 0
fi

MODULE="$1"

# ── Validation ──────────────────────────────────────────────────────────────────
if [[ ! "$MODULE" =~ ^[a-z][a-z0-9-]*$ ]]; then
  error "Invalid module name '${MODULE}' — use lowercase letters, digits, and hyphens only"
  exit 1
fi

MODULE_DIR="apps/backend/src/modules/${MODULE}"

if [[ -d "$MODULE_DIR" ]]; then
  error "Module '${MODULE}' already exists at ${MODULE_DIR}"
  exit 1
fi

# Pascal-case for OpenAPI tags (hyphens become spaces, each word capitalised)
PASCAL=$(echo "$MODULE" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2); print}' | sed 's/ //g')

echo -e "\n${BOLD}Scaffolding module: ${MODULE}${RESET} (tags: ${PASCAL})\n"

# ── Directory structure ─────────────────────────────────────────────────────────
mkdir -p "${MODULE_DIR}/usecases"
mkdir -p "${MODULE_DIR}/__tests__"
success "Created directory structure"

# ── routes.ts ──────────────────────────────────────────────────────────────────
cat > "${MODULE_DIR}/routes.ts" << EOF
import { createRoute, z } from "@hono/zod-openapi";
import { apiErrorSchema, apiSuccessSchema } from "@repo/shared";
import {
	INTERNAL_SERVER_ERROR,
	jsonRes,
	OK,
} from "@/lib/types";

const tags = ["${PASCAL}"];

const ${PASCAL}ResponseSchema = apiSuccessSchema(z.array(z.object({ id: z.string() })));

const e500 = jsonRes(apiErrorSchema, "Internal server error");

// ─── Routes ──────────────────────────────────────────────────────────────────

export const list = createRoute({
	method: "get",
	path: "/${MODULE}",
	tags,
	summary: "List ${MODULE}",
	description: "Returns all ${MODULE}.",
	responses: {
		[OK]: jsonRes(${PASCAL}ResponseSchema, "List of ${MODULE}"),
		[INTERNAL_SERVER_ERROR]: e500,
	},
});

export type ListRoute = typeof list;
EOF
success "routes.ts"

# ── ${MODULE}.errors.ts ────────────────────────────────────────────────────────
cat > "${MODULE_DIR}/${MODULE}.errors.ts" << EOF
// Domain errors — typed, expected outcomes that aren't bugs.
// Each variant carries exactly the data a caller needs to handle it.
// Add new variants here as business logic grows.
export type ${PASCAL}NotFound = { type: "${PASCAL^^}_NOT_FOUND"; lookup: string };

// The union of all domain errors this module's repository can return.
export type ${PASCAL}RepoError = ${PASCAL}NotFound;
EOF
success "${MODULE}.errors.ts"

# ── ${MODULE}.repository.ts ────────────────────────────────────────────────────
cat > "${MODULE_DIR}/${MODULE}.repository.ts" << EOF
// Repository pattern:
// - Never throws. All failures are encoded in the return type.
// - Infrastructure errors (DB down, bad connection) become InfrastructureError.
// - Domain errors (not found, conflict) are typed discriminated unions.
// - Callers destructure the Result and handle each branch.
import type { Result } from "@repo/shared";
import { ok } from "@repo/shared";
import { InfrastructureError } from "@/lib/error";

// TODO: Replace with a real DB model from @repo/db/schema
type ${PASCAL}Item = { id: string };

export async function findAll(): Promise<
	Result<${PASCAL}Item[], InfrastructureError>
> {
	// TODO: Replace with a real Drizzle query, e.g.:
	//   const result = await tryInfra("list ${MODULE}", () => db.query.${MODULE}.findMany());
	return ok([]);
}
EOF
success "${MODULE}.repository.ts"

# ── usecases/${MODULE}.usecases.ts ─────────────────────────────────────────────
cat > "${MODULE_DIR}/usecases/${MODULE}.usecases.ts" << EOF
// Use-cases: functional core.
//
// Pure functions that receive already-loaded domain values and apply business rules.
// No DB imports, no async unless unavoidable, no HTTP.
// Testable by calling with plain values — no mocks, no DB setup.

// Example use-case skeleton — remove or replace as needed.
// import { ok, type Result } from "@repo/shared";
// export function doSomething(input: unknown): Result<unknown, never> {
//   return ok(input);
// }
EOF
success "usecases/${MODULE}.usecases.ts"

# ── handlers.ts ────────────────────────────────────────────────────────────────
cat > "${MODULE_DIR}/handlers.ts" << EOF
// Handlers: imperative shell.
//
// Each handler:
//   1. Reads validated input from context (routes.ts guarantees shape).
//   2. Calls the repository (or a use-case + repository for business logic).
//   3. Maps every Result branch to an HTTP response with match + switch.
//
// Rules:
//   - Never throws. All branches are covered.
//   - Infrastructure failures → 500. Domain errors → specific 4xx.
//   - match() handles the ok/err split.
import { match } from "@repo/shared";
import type { AppRouteHandler } from "@/lib/types";
import {
	failure,
	INTERNAL_SERVER_ERROR,
	OK,
	success,
} from "@/lib/types";
import type { ListRoute } from "./routes";
import { findAll } from "./${MODULE}.repository";

// GET /${MODULE}
export const listHandler: AppRouteHandler<ListRoute> = async (c) => {
	const result = await findAll();

	return match(result, {
		ok: (items) => c.json(success(items), OK),
		err: (_e) => {
			// findAll only returns InfrastructureError — no domain error variants yet.
			// Add a switch(_e.type) here once you introduce domain errors.
			return c.json(
				failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }),
				INTERNAL_SERVER_ERROR,
			);
		},
	});
};
EOF
success "handlers.ts"

# ── index.ts ───────────────────────────────────────────────────────────────────
cat > "${MODULE_DIR}/index.ts" << EOF
import { createRouter } from "@/lib/create-app";
import * as handlers from "./handlers";
import * as routes from "./routes";

const router = createRouter().openapi(routes.list, handlers.listHandler);

export default router;
EOF
success "index.ts"

# ── __tests__/handlers.test.ts ─────────────────────────────────────────────────
cat > "${MODULE_DIR}/__tests__/handlers.test.ts" << EOF
import { describe, it } from "vitest";

// Integration tests for the ${MODULE} handlers.
// Import the router directly and use Hono's testClient to invoke routes
// without a real HTTP server — see the users tests for a complete example.

describe("${MODULE} handlers", () => {
	it.todo("GET /${MODULE} returns an empty list");
});
EOF
success "__tests__/handlers.test.ts"

# ── Auto-format with Biome ─────────────────────────────────────────────────────
if command -v pnpm >/dev/null 2>&1 && [[ -f "biome.json" ]]; then
  pnpm exec biome check --write "${MODULE_DIR}" >/dev/null 2>&1 && success "Biome formatting applied" || warn "Biome check had warnings (non-fatal)"
fi

# ── Next steps ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Module '${MODULE}' scaffolded at ${MODULE_DIR}${RESET}"
echo ""
echo -e "${BOLD}Register the module in apps/backend/src/routes/index.ts:${RESET}"
echo ""
echo -e "  ${CYAN}// 1. Add import at the top${RESET}"
echo    "  import ${MODULE} from \"@/modules/${MODULE}\";"
echo ""
echo -e "  ${CYAN}// 2. Add to the appropriate array${RESET}"
echo    "  // For protected routes (auth required):"
echo    "  export const routes = [users, ${MODULE}];"
echo ""
echo    "  // For public routes (no auth):"
echo    "  export const publicRoutes = [health, ${MODULE}];"
echo ""
echo -e "${BOLD}Then:${RESET}"
echo    "  • Add your DB schema and table to packages/db/src/schema/"
echo    "  • Run pnpm db:generate && pnpm db:migrate"
echo    "  • Flesh out ${MODULE}.repository.ts with real Drizzle queries"
echo    "  • Add use-cases to usecases/${MODULE}.usecases.ts as logic grows"

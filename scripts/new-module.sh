#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/new-module.sh <module-name>"
  echo "Example: ./scripts/new-module.sh posts"
  exit 1
fi

MODULE=$1
MODULE_DIR="apps/backend/src/modules/$MODULE"

if [ -d "$MODULE_DIR" ]; then
  echo "❌ Module '$MODULE' already exists"
  exit 1
fi

echo "📁 Creating module: $MODULE"

mkdir -p "$MODULE_DIR/usecases"

# routes.ts
cat > "$MODULE_DIR/routes.ts" << 'EOF'
import { createRoute, z } from "@hono/zod-openapi";

const tags = ["MODULE_NAME"];

export const list = createRoute({
  method: "get",
  path: "/MODULE_NAME",
  tags,
  responses: {
    200: {
      description: "List MODULE_NAME",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(z.object({ id: z.string() })),
          }),
        },
      },
    },
  },
});

export type ListRoute = typeof list;
EOF

# handlers.ts
cat > "$MODULE_DIR/handlers.ts" << 'EOF'
import type { AppRouteHandler } from "@/lib/types";
import { success } from "@/lib/types";
import type { ListRoute } from "./routes";

export const listHandler: AppRouteHandler<ListRoute> = async (c) => {
  // TODO: Implement
  return c.json(success([]), 200);
};
EOF

# index.ts
cat > "$MODULE_DIR/index.ts" << 'EOF'
import { createRouter } from "@/lib/create-app";
import * as routes from "./routes";
import * as handlers from "./handlers";

const router = createRouter()
  .openapi(routes.list, handlers.listHandler);

export default router;
EOF

# Replace placeholders
sed -i.bak "s/MODULE_NAME/$MODULE/g" "$MODULE_DIR"/*.ts && rm -f "$MODULE_DIR"/*.ts.bak

echo "✅ Module created at $MODULE_DIR"
echo ""
echo "Next steps:"
echo "  1. Add to apps/backend/src/routes/index.ts:"
echo "     import $MODULE from \"@/modules/$MODULE\";"
echo "     export const routes = [$MODULE];"
echo ""
echo "  2. Create use-cases in $MODULE_DIR/usecases/"

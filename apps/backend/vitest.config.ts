import path from "node:path";
import { defineConfig } from "vitest/config";

const repo = (pkg: string) => path.resolve(__dirname, "../../packages", pkg);

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
		coverage: {
			reporter: ["text", "json", "html"],
		},
	},
	resolve: {
		alias: {
			// Internal path alias
			"@": path.resolve(__dirname, "./src"),
			// Workspace packages — point straight to source so no build step is needed
			"@repo/shared": repo("shared/src/index.ts"),
			"@repo/db/schema": repo("db/src/schema/index.ts"),
			"@repo/db/types": repo("db/src/types.ts"),
			"@repo/db": repo("db/src/index.ts"),
		},
	},
});

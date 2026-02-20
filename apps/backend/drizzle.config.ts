import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import env from "./src/env.js";

export default defineConfig({
	schema: "../../packages/db/src/schema/*.ts",
	out: "../../packages/db/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
	verbose: true,
	strict: true,
});

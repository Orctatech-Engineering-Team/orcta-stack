import { defineConfig } from "drizzle-kit";

const DATABASE_URL = Deno.env.get("DATABASE_URL");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

export default defineConfig({
  schema: "../../packages/db/src/schema/*.ts",
  out: "../../packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: DATABASE_URL },
  verbose: true,
  strict: true,
});

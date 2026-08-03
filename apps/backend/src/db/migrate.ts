import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const DATABASE_URL = Deno.env.get("DATABASE_URL");
if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is required.");
  Deno.exit(1);
}

const migrationsFolder = new URL(
  "../../../../packages/db/migrations",
  import.meta.url,
).pathname;

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log(`Running migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    Deno.exit(1);
  })
  .finally(() => client.end());

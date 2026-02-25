import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("Error: DATABASE_URL environment variable is required.");
	process.exit(1);
}

// In the Docker image the runner WORKDIR is /app and migrations are copied to /app/migrations.
// Locally, process.cwd() is the workspace root where packages/db/migrations lives — but the
// recommended approach for local dev is `pnpm db:migrate` (drizzle-kit push).
const migrationsFolder = path.join(process.cwd(), "migrations");

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
		process.exit(1);
	})
	.finally(() => client.end());

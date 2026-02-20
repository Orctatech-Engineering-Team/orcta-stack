import { serve } from "@hono/node-server";
import app from "@/app";
import env from "@/env";

const server = serve({
	fetch: app.fetch,
	port: env.PORT,
});

console.log(`Server running at http://localhost:${env.PORT}`);
console.log(`📚 API docs at http://localhost:${env.PORT}/docs`);

// Graceful shutdown
const shutdown = () => {
	console.log("\n Shutting down gracefully...");
	server.close(() => {
		console.log("✅ Server closed");
		process.exit(0);
	});
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

import app from "@/app";
import env from "@/env";

console.log(`Server running at http://localhost:${env.PORT}`);
console.log(`API docs at http://localhost:${env.PORT}/docs`);

const abortController = new AbortController();

Deno.serve(
  { port: env.PORT, signal: abortController.signal },
  (req) => app.fetch(req),
);

// Graceful shutdown
const shutdown = () => {
  console.log("\n Shutting down gracefully...");
  abortController.abort();
  console.log("✅ Server closed");
  Deno.exit(0);
};

Deno.addSignalListener("SIGTERM", shutdown);
Deno.addSignalListener("SIGINT", shutdown);

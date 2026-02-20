import { cors } from "hono/cors";
import { showRoutes } from "hono/dev";
import { auth } from "@/lib/auth";
import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import { authMiddleware } from "@/middlewares/auth";
import { publicRoutes, routes } from "@/routes/index";
import env from "@/env";

const app = createApp();

const allowedOrigins = new Set([
	"http://localhost:5173",
	"http://localhost:5174",
	env.FRONTEND_URL,
]);

// CORS configuration
app.use(
	"*",
	cors({
		origin: [...allowedOrigins],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
		allowHeaders: ["Content-Type", "Authorization"],
		exposeHeaders: ["set-auth-token"],
		credentials: true,
	}),
);

// OpenAPI documentation
configureOpenAPI(app);

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Public routes (no auth required)
for (const route of publicRoutes) {
	app.route("/api", route);
}

// Apply auth middleware to all /api/* routes
app.use("/api/*", authMiddleware);

// Protected routes
for (const route of routes) {
	app.route("/api", route);
}

// Show routes in development
if (env.NODE_ENV === "development") {
	showRoutes(app);
}

export type AppType = (typeof routes)[number];

export default app;

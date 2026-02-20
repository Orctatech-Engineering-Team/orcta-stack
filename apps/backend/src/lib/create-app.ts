import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";
import { notFound, onError } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";
import pino from "pino";
import env from "@/env";
import type { Session } from "./auth";

export type AppEnv = {
	Variables: {
		user: Session["user"];
		session: Session["session"];
	};
};

export function createRouter() {
	return new OpenAPIHono<AppEnv>({
		defaultHook,
	});
}

export default function createApp() {
	const app = createRouter();

	// Logging
	app.use(
		pinoLogger({
			pino: pino({
				level: env.LOG_LEVEL,
				transport:
					env.NODE_ENV === "development"
						? { target: "pino-pretty", options: { colorize: true } }
						: undefined,
			}),
		}),
	);

	// Error handling
	app.onError(onError);
	app.notFound(notFound);

	return app;
}

export type AppType = ReturnType<typeof createApp>;

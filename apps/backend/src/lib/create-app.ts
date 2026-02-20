import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";
import { notFound, onError } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";
import pino from "pino";
import { multistream } from "pino";
import env from "@/env";
import type { Session } from "./auth";
import type { WideEvent } from "./types";

export type AppEnv = {
	Variables: {
		user: Session["user"];
		session: Session["session"];
		wideEvent: WideEvent;
	};
};

export function createRouter() {
	return new OpenAPIHono<AppEnv>({
		defaultHook,
	});
}

function buildPinoInstance() {
	if (env.NODE_ENV === "development") {
		return pino({
			level: env.LOG_LEVEL,
			transport: { target: "pino-pretty", options: { colorize: true } },
		});
	}

	const streams: pino.StreamEntry[] = [
		{ level: env.LOG_LEVEL, stream: process.stdout },
	];

	if (env.AXIOM_TOKEN && env.AXIOM_DATASET) {
		// Dynamic import keeps the Axiom transport out of dev/test bundles
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { createWriteStream } = require("@axiomhq/pino");
		streams.push({
			level: "info",
			stream: createWriteStream({
				dataset: env.AXIOM_DATASET,
				token: env.AXIOM_TOKEN,
			}),
		});
	}

	return pino({ level: env.LOG_LEVEL }, multistream(streams));
}

export default function createApp() {
	const app = createRouter();

	// Logging — hono-pino binds a per-request logger to context; wide-event
	// middleware uses this logger to emit the single canonical event.
	app.use(
		pinoLogger({
			pino: buildPinoInstance(),
			// Suppress hono-pino's own per-request log — we emit the wide event instead
			http: false,
		}),
	);

	// Error handling
	app.onError(onError);
	app.notFound(notFound);

	return app;
}

export type AppType = ReturnType<typeof createApp>;

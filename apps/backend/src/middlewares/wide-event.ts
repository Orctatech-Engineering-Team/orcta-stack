import type { Context, Next } from "hono";
import { getLogger } from "hono-pino";
import type { AppEnv } from "@/lib/create-app";
import type { WideEvent } from "@/lib/types";
import env from "@/env";

// ─── Tail-based sampling ─────────────────────────────────────────────────────
// Make the sampling decision AFTER the request completes, based on outcome.
// This guarantees we never lose errors or slow requests while keeping costs low.
//
// Rules:
//   - Always keep: 5xx responses, any error field, requests > 2s, admin users
//   - Randomly sample 5% of everything else
function shouldSample(event: WideEvent): boolean {
	if ((event.status_code ?? 0) >= 500) return true;
	if (event.outcome === "error") return true;
	if ((event.duration_ms ?? 0) > 2000) return true;
	if (event.user?.role === "admin") return true;
	return Math.random() < 0.05;
}

// ─── Wide Event Middleware ────────────────────────────────────────────────────
// Implements the "canonical log line" pattern from https://loggingsucks.com.
//
// One structured event is emitted per request containing:
//   - Request context (method, path, request_id, ip, user_agent)
//   - Infrastructure context (service, version, region)
//   - User context (populated by authMiddleware via addToEvent)
//   - Business context (populated by handlers via addToEvent)
//   - Outcome context (status_code, duration_ms, error — added in finally)
//
// hono-pino's own per-request log is suppressed in create-app.ts so this is
// the only log emitted per request.
export async function wideEventMiddleware(c: Context<AppEnv>, next: Next) {
	const startTime = Date.now();

	const event: WideEvent = {
		timestamp: new Date().toISOString(),
		request_id: crypto.randomUUID(),
		method: c.req.method,
		path: c.req.path,
		ip:
			c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown",
		user_agent: c.req.header("user-agent"),
		service: "backend",
		service_version: env.SERVICE_VERSION,
		region: env.REGION,
	};

	c.set("wideEvent", event);

	try {
		await next();
		event.status_code = c.res.status;
		event.outcome = c.res.status < 500 ? "success" : "error";
	} catch (err) {
		event.status_code = 500;
		event.outcome = "error";
		event.error = {
			type: err instanceof Error ? err.constructor.name : "UnknownError",
			message: err instanceof Error ? err.message : String(err),
		};
		throw err;
	} finally {
		event.duration_ms = Date.now() - startTime;

		if (shouldSample(event)) {
			getLogger(c).info(event);
		}
	}
}

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
	// Never drop errors or slow requests — these are the events that matter most.
	if ((event.status_code ?? 0) >= 500) return true;
	if (event.outcome === "error") return true;
	if ((event.duration_ms ?? 0) > 2000) return true;
	// Never drop admin users — low volume, high signal.
	if (event.user?.role === "admin") return true;
	// Never drop requests annotated with feature_flags — critical during rollouts.
	// Handlers set this via: addToEvent(c, { feature_flags: { flag_name: true } })
	if (event.feature_flags && Object.keys(event.feature_flags).length > 0) return true;
	// Random sample 5% of happy, fast, normal requests.
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
		// Propagate trace_id from upstream (gateway/client) if present so events
		// across services can be correlated by the same ID without a full OTel setup.
		// Falls back to a new UUID so every event always has a trace_id.
		trace_id: c.req.header("x-trace-id") ?? crypto.randomUUID(),
		method: c.req.method,
		path: c.req.path,
		ip:
			c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown",
		user_agent: c.req.header("user-agent"),
		service: "backend",
		service_version: env.SERVICE_VERSION,
		deployment_id: env.DEPLOYMENT_ID,
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

import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { ApiError, ApiSuccess } from "@repo/shared";
import type { Context } from "hono";
import type { ZodType } from "zod";
import type { AppEnv } from "./create-app";
import { InfrastructureError } from "./error";

// Re-export for convenience
export type {
	ApiError,
	ApiResponse,
	ApiSuccess,
	Err,
	Ok,
	Result,
} from "@repo/shared";
export { err, isErr, isOk, ok } from "@repo/shared";

// ─── HTTP status codes ───────────────────────────────────────────────────────
// Re-exported here so handlers only need a single import from "@/lib/types".
export {
	BAD_REQUEST,
	CONFLICT,
	CREATED,
	FORBIDDEN,
	INTERNAL_SERVER_ERROR,
	NO_CONTENT,
	NOT_FOUND,
	OK,
	SERVICE_UNAVAILABLE,
	TOO_MANY_REQUESTS,
	UNAUTHORIZED,
	UNPROCESSABLE_ENTITY,
} from "./http-status-codes";

// Type-safe route handler
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;

// ─── Route definition helpers ────────────────────────────────────────────────

// Wraps a schema in the JSON content envelope required by @hono/zod-openapi responses.
//
// Before:
//   200: { content: { "application/json": { schema: userSchema } }, description: "Found" }
// After:
//   200: jsonRes(userSchema, "Found")
export function jsonRes<S extends ZodType>(schema: S, description: string) {
	return { content: { "application/json": { schema } }, description } as const;
}

// Wraps a schema in the JSON content envelope required by @hono/zod-openapi request bodies.
//
// Before:
//   body: { content: { "application/json": { schema: bodySchema } } }
// After:
//   body: jsonBody(bodySchema)
export function jsonBody<S extends ZodType>(schema: S) {
	return { content: { "application/json": { schema } } } as const;
}

// ─── Response helpers ────────────────────────────────────────────────────────
export function success<T>(data: T): ApiSuccess<T> {
	return { success: true, data };
}

export function failure(error: {
	code: string;
	message: string;
	details?: Record<string, unknown>;
}): ApiError {
	return { success: false, error };
}

// Checks if a result error is an infrastructure failure.
// Use in handlers to separate "our system is broken" from "business rule not met".
//
// Example:
//   const result = await findUserById(id);
//   if (!result.ok) {
//     if (isInfraError(result.error)) return c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), 500);
//     // result.error is now narrowed to your domain error union
//     switch (result.error.type) {
//       case "USER_NOT_FOUND": return c.json(failure({ code: "NOT_FOUND", message: "User not found" }), 404);
//     }
//   }
export const isInfraError = (e: unknown): e is InfrastructureError =>
	e instanceof InfrastructureError;

// ─── Wide Events ─────────────────────────────────────────────────────────────
// A wide event is a single, context-rich log emitted once per request per
// service. The handler / middleware merges fields progressively throughout the
// request lifecycle using addToEvent(), then the wide-event middleware emits
// the complete record at the end.
//
// Inspired by: https://loggingsucks.com — "Implementing Wide Events" section.

export type WideEvent = {
	// ── Request context (populated by wideEventMiddleware) ───────────────────
	request_id?: string;
	// trace_id: forwarded from x-trace-id header when set by a gateway or client,
	// otherwise equals request_id. Enables multi-service correlation without a
	// full distributed tracing setup.
	trace_id?: string;
	timestamp?: string;
	method?: string;
	path?: string;
	status_code?: number;
	duration_ms?: number;
	outcome?: "success" | "error";

	// ── Infrastructure context (populated by wideEventMiddleware) ────────────
	service?: string;
	service_version?: string;
	// deployment_id: the docker image tag / git SHA of the running process.
	// Distinct from service_version: version tracks the code, deployment_id
	// tracks the running artifact. Critical for "which deploy caused this?".
	deployment_id?: string;
	region?: string;
	ip?: string;
	user_agent?: string;

	// ── Auth context (populated by authMiddleware) ────────────────────────────
	// session_id: the better-auth session ID — high-cardinality, distinct from
	// user_id. One user can have many concurrent sessions across devices.
	session_id?: string;
	user?: {
		id: string;
		role: string;
		// Add subscription, plan, or any user attribute handlers want to query on.
		// Example: addToEvent(c, { user: { ...existing, subscription: "pro" } })
		[k: string]: unknown;
	};

	// ── Error context (set in wideEventMiddleware catch block) ───────────────
	error?: {
		type?: string;
		message?: string;
		// code: machine-readable error code (e.g. "card_declined", "rate_limited")
		code?: string;
		// retriable: is this a transient error worth retrying?
		retriable?: boolean;
		[k: string]: unknown;
	};

	// ── Business context (populated by handlers via addToEvent) ───────────────
	// feature_flags: track which flags were active for this request.
	// Used in tail sampling to always retain events from experimental rollouts.
	// Example: addToEvent(c, { feature_flags: { new_checkout_flow: true } })
	feature_flags?: Record<string, boolean>;

	// Arbitrary handler-defined fields — business domain data.
	[key: string]: unknown;
};

// Merges additional fields into the in-flight wide event.
// Call this from handlers and middleware to add business context.
//
// Example:
//   addToEvent(c, { order: { id, total_cents }, payment: { method } });
export function addToEvent(
	c: Context<AppEnv>,
	fields: Partial<WideEvent>,
): void {
	const event = c.get("wideEvent");
	if (event) Object.assign(event, fields);
}

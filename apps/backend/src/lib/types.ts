import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { ApiError, ApiSuccess } from "@repo/shared";
import type { Context } from "hono";
import type { ZodType } from "zod";
import type { AppEnv } from "./create-app";
import { InfrastructureError } from "./error";

/**
 * Shared API response types re-exported for handler convenience.
 */
export type {
	ApiError,
	ApiResponse,
	ApiSuccess,
	Err,
	Ok,
	Result,
} from "@repo/shared";

/**
 * Functional result helpers re-exported for handler convenience.
 */
export { err, isErr, isOk, ok } from "@repo/shared";

/**
 * Common HTTP status code constants.
 *
 * Re-exported so handlers can import all response utilities
 * from a single module.
 */
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

/**
 * Strongly typed route handler bound to the application environment.
 *
 * Ensures handlers receive the correct Context<AppEnv> typing
 * when used with @hono/zod-openapi.
 */
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;

/**
 * Wraps a Zod schema inside the OpenAPI JSON response envelope.
 *
 * Reduces repetitive nesting when defining route responses.
 *
 * @example
 * 200: jsonRes(userSchema, "User retrieved")
 */
export function jsonRes<S extends ZodType>(schema: S, description: string) {
	return {
		content: { "application/json": { schema } },
		description,
	} as const;
}

/**
 * Wraps a Zod schema inside the OpenAPI JSON request body envelope.
 *
 * Standardizes request body definitions.
 *
 * @example
 * body: jsonBody(createUserSchema)
 */
export function jsonBody<S extends ZodType>(schema: S) {
	return {
		content: { "application/json": { schema } },
	} as const;
}

/**
 * Constructs a successful API response.
 *
 * @param data - Response payload
 */
export function success<T>(data: T): ApiSuccess<T> {
	return { success: true, data };
}

/**
 * Constructs a standardized API error response.
 *
 * @param error - Machine-readable error payload
 */
export function failure(error: {
	code: string;
	message: string;
	details?: Record<string, unknown>;
}): ApiError {
	return { success: false, error };
}

/**
 * Type guard for detecting infrastructure-level failures.
 *
 * Used to distinguish system errors (network, database, external services)
 * from domain/business rule errors.
 */
export const isInfraError = (e: unknown): e is InfrastructureError =>
	e instanceof InfrastructureError;

/**
 * WideEvent
 *
 * Represents a single, context-rich log record emitted once per request.
 *
 * Fields are progressively merged throughout the request lifecycle by
 * handlers and middleware. Final emission is handled centrally by the
 * wide-event middleware.
 */
export type WideEvent = {
	/** Unique request identifier */
	request_id?: string;

	/**
	 * Trace identifier for cross-service correlation.
	 *
	 * Forwarded from `x-trace-id` when present, otherwise defaults
	 * to `request_id`.
	 */
	trace_id?: string;

	/** ISO timestamp */
	timestamp?: string;

	/** HTTP method */
	method?: string;

	/** Request path */
	path?: string;

	/** Final HTTP status code */
	status_code?: number;

	/** Request duration in milliseconds */
	duration_ms?: number;

	/** Request outcome classification */
	outcome?: "success" | "error";

	/** Logical service name */
	service?: string;

	/** Code/service version */
	service_version?: string;

	/**
	 * Deployment identifier.
	 *
	 * Typically a Docker image tag or Git SHA. Distinct from
	 * `service_version`.
	 */
	deployment_id?: string;

	/** Execution region */
	region?: string;

	/** Client IP address */
	ip?: string;

	/** Client user agent */
	user_agent?: string;

	/** Session identifier */
	session_id?: string;

	/** Authenticated user context */
	user?: {
		id: string;
		role: string;
		[k: string]: unknown;
	};

	/** Error metadata */
	error?: {
		type?: string;
		message?: string;
		code?: string;
		retriable?: boolean;
		[k: string]: unknown;
	};

	/** Feature flag snapshot */
	feature_flags?: Record<string, boolean>;

	/** Arbitrary handler-defined fields */
	[key: string]: unknown;
};

/**
 * Merges additional fields into the active wide event.
 *
 * Safe no-op if the wide-event middleware has not initialized
 * an event object for the request.
 *
 * @param c - Hono request context
 * @param fields - Partial event fields to merge
 */
export function addToEvent(
	c: Context<AppEnv>,
	fields: Partial<WideEvent>,
): void {
	const event = c.get("wideEvent");
	if (event) Object.assign(event, fields);
}

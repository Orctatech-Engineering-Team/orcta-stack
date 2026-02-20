import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { ZodType } from "zod";
import type { AppEnv } from "./create-app";
import type { ApiSuccess, ApiError } from "@repo/shared";
import { InfrastructureError } from "./error";

// Re-export for convenience
export type { ApiSuccess, ApiError, ApiResponse } from "@repo/shared";
export type { Result, Ok, Err } from "@repo/shared";
export { ok, err, isOk, isErr } from "@repo/shared";

// ─── HTTP status codes ───────────────────────────────────────────────────────
// Re-exported here so handlers only need a single import from "@/lib/types".
export {
	OK,
	CREATED,
	NO_CONTENT,
	BAD_REQUEST,
	UNAUTHORIZED,
	FORBIDDEN,
	NOT_FOUND,
	CONFLICT,
	UNPROCESSABLE_ENTITY,
	TOO_MANY_REQUESTS,
	INTERNAL_SERVER_ERROR,
	SERVICE_UNAVAILABLE,
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

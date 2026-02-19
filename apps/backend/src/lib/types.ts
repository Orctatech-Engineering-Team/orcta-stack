import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "./create-app";
import type { ApiSuccess, ApiError } from "@repo/shared";

// Re-export for convenience
export type { ApiSuccess, ApiError, ApiResponse } from "@repo/shared";

// Type-safe route handler
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;

// Response helpers
export function success<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function failure(error: { code: string; message: string; details?: Record<string, unknown> }): ApiError {
  return { success: false, error };
}

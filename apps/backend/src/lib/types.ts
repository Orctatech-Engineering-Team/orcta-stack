import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "./create-app";

// Type-safe route handler
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;

// API response types
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Response helper functions
export function success<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function failure(error: { code: string; message: string; details?: Record<string, unknown> }): ApiError {
  return { success: false, error };
}

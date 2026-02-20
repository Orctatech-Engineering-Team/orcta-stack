import { createRoute, z } from "@hono/zod-openapi";
import { apiSuccessSchema, apiErrorSchema } from "@repo/shared";
import {
  jsonRes,
  OK,
  INTERNAL_SERVER_ERROR,
  SERVICE_UNAVAILABLE,
} from "@/lib/types";

const tags = ["Health"];

const healthDataSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string(),
  version: z.string(),
  uptime: z.number(),
  services: z.object({
    database: z.enum(["up", "down"]),
  }),
});

const healthResponseSchema = apiSuccessSchema(healthDataSchema);

export const healthCheck = createRoute({
  method: "get",
  path: "/health",
  tags,
  summary: "Health check",
  description: "Check the health status of the API and its dependencies",
  responses: {
    [OK]: jsonRes(healthResponseSchema, "Service is healthy"),
    [INTERNAL_SERVER_ERROR]: jsonRes(apiErrorSchema, "Service is unhealthy"),
    [SERVICE_UNAVAILABLE]: jsonRes(healthResponseSchema, "Service is degraded"),
  },
});

export const ping = createRoute({
  method: "get",
  path: "/ping",
  tags,
  summary: "Ping",
  description: "Simple ping endpoint for basic connectivity check",
  responses: {
    [OK]: jsonRes(apiSuccessSchema(z.object({ message: z.literal("pong") })), "Pong response"),
  },
});

export type HealthCheckRoute = typeof healthCheck;
export type PingRoute = typeof ping;

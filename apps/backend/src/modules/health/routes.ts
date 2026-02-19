import { createRoute, z } from "@hono/zod-openapi";

const tags = ["Health"];

// Health check response schema
const healthResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    status: z.enum(["healthy", "degraded", "unhealthy"]),
    timestamp: z.string(),
    version: z.string(),
    uptime: z.number(),
    services: z.object({
      database: z.enum(["up", "down"]),
    }),
  }),
});

export const healthCheck = createRoute({
  method: "get",
  path: "/health",
  tags,
  summary: "Health check",
  description: "Check the health status of the API and its dependencies",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
    503: {
      description: "Service is unhealthy",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
  },
});

export const ping = createRoute({
  method: "get",
  path: "/ping",
  tags,
  summary: "Ping",
  description: "Simple ping endpoint for basic connectivity check",
  responses: {
    200: {
      description: "Pong response",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              message: z.literal("pong"),
            }),
          }),
        },
      },
    },
  },
});

export type HealthCheckRoute = typeof healthCheck;
export type PingRoute = typeof ping;

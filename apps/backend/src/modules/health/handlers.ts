import type { AppRouteHandler } from "@/lib/types";
import { success } from "@/lib/types";
import type { HealthCheckRoute, PingRoute } from "./routes";
import { checkHealthUseCase } from "./usecases/check-health.usecase";
import { db } from "@/db";

const startTime = Date.now();

// Dependency injection for health check
const deps = {
  checkDatabase: async () => {
    try {
      await db.execute`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  },
};

export const healthCheckHandler: AppRouteHandler<HealthCheckRoute> = async (c) => {
  const result = await checkHealthUseCase(deps, {
    startTime,
    version: "1.0.0",
  });

  switch (result.type) {
    case "HEALTHY":
      return c.json(success(result.data), 200);
    case "UNHEALTHY":
      return c.json(success(result.data), 503);
  }
};

export const pingHandler: AppRouteHandler<PingRoute> = async (c) => {
  return c.json(success({ message: "pong" as const }), 200);
};

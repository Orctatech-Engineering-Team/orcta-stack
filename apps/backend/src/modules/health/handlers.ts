import type { AppRouteHandler } from "@/lib/types";
import { success, OK, SERVICE_UNAVAILABLE } from "@/lib/types";
import type { HealthCheckRoute, PingRoute } from "./routes";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const startTime = Date.now();

export const healthCheckHandler: AppRouteHandler<HealthCheckRoute> = async (
	c,
) => {
	let databaseUp = false;
	try {
		await db.execute(sql`SELECT 1`);
		databaseUp = true;
	} catch {
		databaseUp = false;
	}

	const data = {
		status: (databaseUp ? "healthy" : "unhealthy") as "healthy" | "unhealthy",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
		uptime: Math.floor((Date.now() - startTime) / 1000),
		services: { database: (databaseUp ? "up" : "down") as "up" | "down" },
	};

	return c.json(success(data), databaseUp ? OK : SERVICE_UNAVAILABLE);
};

export const pingHandler: AppRouteHandler<PingRoute> = async (c) => {
	return c.json(success({ message: "pong" as const }), OK);
};

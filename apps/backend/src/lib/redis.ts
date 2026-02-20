import Redis from "ioredis";
import env from "@/env";

export const redis = env.REDIS_URL
	? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
	: null;

export function getRedis(): Redis {
	if (!redis) {
		throw new Error("REDIS_URL not configured");
	}
	return redis;
}

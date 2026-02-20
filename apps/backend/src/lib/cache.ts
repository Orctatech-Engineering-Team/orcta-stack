// Cache helpers — thin wrapper over the shared Redis client.
//
// All functions degrade gracefully when Redis is not configured:
//   - withCache() falls through to the source-of-truth function.
//   - invalidateCache() is a no-op.
//
// Redis errors during cache reads/writes are swallowed and logged — a cache
// miss is always safe; failing the entire request because Redis hiccuped is not.

import { redis } from "@/lib/redis";

/**
 * Read-through cache.
 *
 * Checks Redis for `key` first. On a miss, calls `fn`, stores the result
 * under `key` with `ttlSeconds` expiry, then returns the value.
 *
 * @example
 *   const user = await withCache(
 *     cacheKey("user", userId),
 *     300, // 5 minutes
 *     () => findUserById(userId),
 *   );
 */
export async function withCache<T>(
	key: string,
	ttlSeconds: number,
	fn: () => Promise<T>,
): Promise<T> {
	if (!redis) return fn();

	try {
		const cached = await redis.get(key);
		if (cached !== null) return JSON.parse(cached) as T;
	} catch {
		// Redis unavailable — fall through to source of truth
	}

	const value = await fn();

	try {
		await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
	} catch {
		// Best-effort write — never fail the request because the cache is down
	}

	return value;
}

/**
 * Delete one or more cache keys.
 * Safe to call with zero keys — it returns immediately.
 *
 * @example
 *   await invalidateCache(cacheKey("user", userId));
 *   await invalidateCache(cacheKey("post", postId), cacheKey("posts", "list"));
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
	if (!redis || keys.length === 0) return;
	await redis.del(...keys);
}

/**
 * Build a namespaced cache key from parts.
 * Parts are joined with `:`.
 *
 * @example
 *   cacheKey("user", userId)          // "user:abc123"
 *   cacheKey("posts", page, limit)    // "posts:1:20"
 */
export function cacheKey(...parts: (string | number)[]): string {
	return parts.join(":");
}

import type { Context, Next } from "hono";

interface RateLimitOptions {
	windowMs?: number; // Time window in ms (default: 60000 = 1 min)
	max?: number; // Max requests per window (default: 100)
	keyGenerator?: (c: Context) => string;
	handler?: (c: Context) => Response;
}

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		if (entry.resetAt < now) store.delete(key);
	}
}, 60000);

export function rateLimit(options: RateLimitOptions = {}) {
	const {
		windowMs = 60000,
		max = 100,
		keyGenerator = (c) =>
			c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
		handler = (c) =>
			c.json(
				{
					success: false,
					error: { code: "RATE_LIMITED", message: "Too many requests" },
				},
				429,
			),
	} = options;

	return async (c: Context, next: Next) => {
		const key = keyGenerator(c);
		const now = Date.now();
		const entry = store.get(key);

		if (!entry || entry.resetAt < now) {
			store.set(key, { count: 1, resetAt: now + windowMs });
			c.header("X-RateLimit-Limit", String(max));
			c.header("X-RateLimit-Remaining", String(max - 1));
			return next();
		}

		if (entry.count >= max) {
			c.header("X-RateLimit-Limit", String(max));
			c.header("X-RateLimit-Remaining", "0");
			c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
			return handler(c);
		}

		entry.count++;
		c.header("X-RateLimit-Limit", String(max));
		c.header("X-RateLimit-Remaining", String(max - entry.count));
		return next();
	};
}

// Presets
export const strictRateLimit = rateLimit({ windowMs: 60000, max: 10 });
export const authRateLimit = rateLimit({ windowMs: 300000, max: 5 }); // 5 per 5 min

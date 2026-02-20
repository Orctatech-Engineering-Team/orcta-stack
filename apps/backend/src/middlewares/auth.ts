import type { Context, Next } from "hono";
import { auth } from "@/lib/auth";

export async function authMiddleware(c: Context, next: Next) {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		return c.json(
			{
				success: false,
				error: { code: "UNAUTHORIZED", message: "Authentication required" },
			},
			401,
		);
	}

	c.set("user", session.user);
	c.set("session", session.session);
	await next();
}

export function requireRole(...roles: string[]) {
	return async (c: Context, next: Next) => {
		const user = c.get("user");

		if (!user) {
			return c.json(
				{
					success: false,
					error: { code: "UNAUTHORIZED", message: "Authentication required" },
				},
				401,
			);
		}

		if (!roles.includes(user.role)) {
			return c.json(
				{
					success: false,
					error: { code: "FORBIDDEN", message: "Insufficient permissions" },
				},
				403,
			);
		}

		await next();
	};
}

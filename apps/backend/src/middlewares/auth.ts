import type { Context, Next } from "hono";
import { auth } from "@/lib/auth";
import type { AppEnv } from "@/lib/create-app";
import { addToEvent, UNAUTHORIZED } from "@/lib/types";

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		return c.json(
			{
				success: false,
				error: { code: "UNAUTHORIZED", message: "Authentication required" },
			},
			UNAUTHORIZED,
		);
	}

	c.set("user", session.user);
	c.set("session", session.session);

	// Enrich the wide event with auth context so every authenticated request
	// carries user identity and session ID without handlers doing it manually.
	// session_id is distinct from user_id: one user can have many concurrent
	// sessions across devices, making it a separate high-cardinality dimension.
	addToEvent(c, {
		session_id: session.session.id,
		user: { id: session.user.id, role: session.user.role ?? "user" },
	});

	await next();
}

export function requireRole(...roles: string[]) {
	return async (c: Context<AppEnv>, next: Next) => {
		const user = c.get("user");

		if (!user) {
			return c.json(
				{
					success: false,
					error: { code: "UNAUTHORIZED", message: "Authentication required" },
				},
				UNAUTHORIZED,
			);
		}

		if (!roles.includes(user.role ?? "user")) {
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

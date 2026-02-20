// Integration tests for users handlers.
//
// These run against a real database — start Postgres before running:
//   docker compose up -d postgres
//
// Auth is handled by actually signing up through the app — no mocks.
// Each test suite gets its own user; afterEach cleans all auth-related tables.
import { describe, it, expect, afterEach } from "vitest";
import app from "@/app";
import { db } from "@/db";
import { schema } from "@/db";
import { eq } from "drizzle-orm";

// ─── Cleanup ─────────────────────────────────────────────────────────────────

afterEach(async () => {
	// verifications has no cascade; delete first.
	await db.delete(schema.verifications);
	// users cascades sessions + accounts.
	await db.delete(schema.users);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Registers a user through the app and returns the session cookie.
// autoSignIn: true in auth config means sign-up also creates the session.
async function signUp(overrides?: {
	email?: string;
	password?: string;
	name?: string;
}) {
	const email = overrides?.email ?? "test@example.com";
	const password = overrides?.password ?? "password-secret-123";
	const name = overrides?.name ?? "Test User";

	const res = await app.request("/api/auth/sign-up/email", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password, name }),
	});

	const cookie = res.headers.get("set-cookie") ?? "";
	return { cookie, email, password, name };
}

// Signs in and returns the session cookie.
async function signIn(email: string, password: string) {
	const res = await app.request("/api/auth/sign-in/email", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	return res.headers.get("set-cookie") ?? "";
}

// Elevates a user to admin directly in the DB.
async function makeAdmin(email: string) {
	await db
		.update(schema.users)
		.set({ role: "admin" })
		.where(eq(schema.users.email, email));
}

// ─── GET /api/users/me ────────────────────────────────────────────────────────

describe("GET /api/users/me", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await app.request("/api/users/me");
		expect(res.status).toBe(401);
	});

	it("returns the current user's profile when authenticated", async () => {
		const { cookie, email, name } = await signUp();
		const res = await app.request("/api/users/me", {
			headers: { Cookie: cookie },
		});

		expect(res.status).toBe(200);
		// biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
		const body = (await res.json()) as any;
		expect(body.success).toBe(true);
		expect(body.data.email).toBe(email);
		expect(body.data.name).toBe(name);
	});
});

// ─── PATCH /api/users/me ─────────────────────────────────────────────────────

describe("PATCH /api/users/me", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await app.request("/api/users/me", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "New Name" }),
		});
		expect(res.status).toBe(401);
	});

	it("updates the user's name", async () => {
		const { cookie } = await signUp();
		const res = await app.request("/api/users/me", {
			method: "PATCH",
			headers: { Cookie: cookie, "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Updated Name" }),
		});

		expect(res.status).toBe(200);
		// biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
		const body = (await res.json()) as any;
		expect(body.data.name).toBe("Updated Name");
	});

	it("returns 409 when the new email is already taken", async () => {
		await signUp({ email: "taken@example.com", name: "Other" });
		const { cookie } = await signUp({ email: "me@example.com", name: "Me" });

		const res = await app.request("/api/users/me", {
			method: "PATCH",
			headers: { Cookie: cookie, "Content-Type": "application/json" },
			body: JSON.stringify({ email: "taken@example.com" }),
		});

		expect(res.status).toBe(409);
		// biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
		const body = (await res.json()) as any;
		expect(body.success).toBe(false);
		expect(body.error.code).toBe("EMAIL_TAKEN");
	});

	it("returns 400 when the email is the same as the current one", async () => {
		const { cookie, email } = await signUp();
		const res = await app.request("/api/users/me", {
			method: "PATCH",
			headers: { Cookie: cookie, "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});

		expect(res.status).toBe(400);
		// biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("EMAIL_UNCHANGED");
	});

	it("updates the email, sets emailVerified to false, and returns the updated user", async () => {
		const { cookie } = await signUp({ email: "old@example.com" });
		const res = await app.request("/api/users/me", {
			method: "PATCH",
			headers: { Cookie: cookie, "Content-Type": "application/json" },
			body: JSON.stringify({ email: "new@example.com" }),
		});

		expect(res.status).toBe(200);
		// biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
		const body = (await res.json()) as any;
		expect(body.data.email).toBe("new@example.com");
		expect(body.data.emailVerified).toBe(false);
	});

	it("returns 200 with the current user when no fields are provided", async () => {
		const { cookie, email } = await signUp();
		const res = await app.request("/api/users/me", {
			method: "PATCH",
			headers: { Cookie: cookie, "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(res.status).toBe(200);
		// biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
		const body = (await res.json()) as any;
		expect(body.data.email).toBe(email);
	});
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

describe("GET /api/users/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await app.request("/api/users/some-id");
		expect(res.status).toBe(401);
	});

	it("returns 403 when authenticated as a regular user", async () => {
		const { cookie } = await signUp();
		const res = await app.request("/api/users/some-id", {
			headers: { Cookie: cookie },
		});

		expect(res.status).toBe(403);
		// biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
		const body = (await res.json()) as any;
		expect(body.error.code).toBe("FORBIDDEN");
	});

	it("returns 404 when the user does not exist (admin)", async () => {
		const { email } = await signUp();
		await makeAdmin(email);
		// Re-sign in to get a fresh session with the updated role
		const freshCookie = await signIn(email, "password-secret-123");

		const res = await app.request("/api/users/nonexistent", {
			headers: { Cookie: freshCookie },
		});

		expect(res.status).toBe(404);
	});

	it("returns the target user when authenticated as admin", async () => {
		// Create the target user
		const { email: targetEmail } = await signUp({
			email: "target@example.com",
			name: "Target",
		});
		// Fetch the target's id from DB
		const target = await db.query.users.findFirst({
			where: eq(schema.users.email, targetEmail),
		});

		// Create and elevate the admin
		const { email: adminEmail } = await signUp({
			email: "admin@example.com",
			name: "Admin",
		});
		await makeAdmin(adminEmail);
		const adminCookie = await signIn(adminEmail, "password-secret-123");

		const res = await app.request(`/api/users/${target?.id}`, {
			headers: { Cookie: adminCookie },
		});

		expect(res.status).toBe(200);
		// biome-ignore lint/suspicious/noExplicitAny: test assertion convenience
		const body = (await res.json()) as any;
		expect(body.data.email).toBe(targetEmail);
	});
});

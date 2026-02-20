// Integration tests for users.repository.
//
// These run against a real database — start Postgres before running:
//   docker compose up -d postgres
//
// Each test is isolated: afterEach cleans out the users table.
// Sessions and accounts cascade on user delete, so no manual cleanup needed.
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/db";
import { users } from "@repo/db/schema";
import { InfrastructureError } from "@/lib/error";
import {
	findUserById,
	findUserByEmail,
	createUser,
	updateUser,
} from "../users.repository";

afterEach(async () => {
	await db.delete(users);
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const alice = {
	id: "test-user-alice",
	email: "alice@example.com",
	name: "Alice",
	emailVerified: false as const,
};

const bob = {
	id: "test-user-bob",
	email: "bob@example.com",
	name: "Bob",
	emailVerified: false as const,
};

// ─── findUserById ─────────────────────────────────────────────────────────────

describe("findUserById", () => {
	it("returns USER_NOT_FOUND when no row exists", async () => {
		const result = await findUserById("nonexistent");
		expect(result).toEqual({
			ok: false,
			error: { type: "USER_NOT_FOUND", lookup: "nonexistent" },
		});
	});

	it("returns the user when the row exists", async () => {
		await db.insert(users).values(alice);
		const result = await findUserById(alice.id);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.id).toBe(alice.id);
			expect(result.value.email).toBe(alice.email);
		}
	});
});

// ─── findUserByEmail ──────────────────────────────────────────────────────────

describe("findUserByEmail", () => {
	it("returns USER_NOT_FOUND when no row exists", async () => {
		const result = await findUserByEmail("nobody@example.com");
		expect(result).toEqual({
			ok: false,
			error: { type: "USER_NOT_FOUND", lookup: "nobody@example.com" },
		});
	});

	it("returns the user when the row exists", async () => {
		await db.insert(users).values(alice);
		const result = await findUserByEmail(alice.email);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.email).toBe(alice.email);
		}
	});
});

// ─── createUser ───────────────────────────────────────────────────────────────

describe("createUser", () => {
	it("inserts and returns the new user", async () => {
		const result = await createUser(alice);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.email).toBe(alice.email);
			expect(result.value.name).toBe(alice.name);
		}
	});

	it("returns EMAIL_TAKEN when the email is already registered", async () => {
		await createUser(alice);
		const result = await createUser({ ...bob, email: alice.email });
		expect(result).toEqual({
			ok: false,
			error: { type: "EMAIL_TAKEN", email: alice.email },
		});
	});

	it("does not insert a duplicate when EMAIL_TAKEN is returned", async () => {
		await createUser(alice);
		await createUser({ ...bob, email: alice.email });
		const rows = await db.select().from(users);
		expect(rows).toHaveLength(1);
	});
});

// ─── updateUser ───────────────────────────────────────────────────────────────

describe("updateUser", () => {
	it("updates and returns the user", async () => {
		await db.insert(users).values(alice);
		const result = await updateUser(alice.id, { name: "Alice Updated" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.name).toBe("Alice Updated");
			expect(result.value.id).toBe(alice.id);
		}
	});

	it("returns USER_NOT_FOUND when no row matches the id", async () => {
		const result = await updateUser("nonexistent", { name: "Ghost" });
		expect(result).toEqual({
			ok: false,
			error: { type: "USER_NOT_FOUND", lookup: "nonexistent" },
		});
	});
});

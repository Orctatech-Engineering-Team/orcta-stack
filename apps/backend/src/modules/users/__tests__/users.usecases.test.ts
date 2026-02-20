// Unit tests for users use-cases.
// Pure functions — no DB, no network, no mocks. Call with plain values.

import type { User } from "@repo/db/schema";
import { describe, expect, it } from "vitest";
import { prepareEmailChange } from "../users.usecases";

// ─── Fixture ─────────────────────────────────────────────────────────────────

const baseUser: User = {
	id: "user-1",
	email: "alice@example.com",
	name: "Alice",
	image: null,
	role: "user",
	emailVerified: true,
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-01"),
};

// ─── prepareEmailChange ───────────────────────────────────────────────────────

describe("prepareEmailChange", () => {
	it("returns the new email and resets emailVerified when the email changes", () => {
		const result = prepareEmailChange(baseUser, "bob@example.com");
		expect(result).toEqual({
			ok: true,
			value: { email: "bob@example.com", emailVerified: false },
		});
	});

	it("returns EMAIL_UNCHANGED when the new email matches the current one", () => {
		const result = prepareEmailChange(baseUser, "alice@example.com");
		expect(result).toEqual({
			ok: false,
			error: { type: "EMAIL_UNCHANGED", email: "alice@example.com" },
		});
	});

	it("always sets emailVerified to false on a successful change", () => {
		// Even if the user already had emailVerified: false, it must stay false.
		const unverified = { ...baseUser, emailVerified: false };
		const result = prepareEmailChange(unverified, "new@example.com");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value.emailVerified).toBe(false);
	});

	it("does not carry forward any other user fields", () => {
		// The return value is only { email, emailVerified } — no id, name, role leakage.
		const result = prepareEmailChange(baseUser, "new@example.com");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Object.keys(result.value)).toEqual(["email", "emailVerified"]);
		}
	});
});

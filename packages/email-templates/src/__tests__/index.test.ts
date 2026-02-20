import { describe, expect, it } from "vitest";
import { passwordResetEmail, welcomeEmail } from "../index.js";

// ─── welcomeEmail ─────────────────────────────────────────────────────────────

describe("welcomeEmail", () => {
	it("uses the user's name in the subject", () => {
		const { subject } = welcomeEmail({ name: "Alice" });
		expect(subject).toBe("Welcome, Alice!");
	});

	it("includes the user's name in the plain text body", () => {
		const { text } = welcomeEmail({ name: "Alice" });
		expect(text).toContain("Alice");
	});

	it("includes the standard sign-off in the plain text body", () => {
		const { text } = welcomeEmail({ name: "Alice" });
		expect(text).toContain("— The Team");
	});

	it("includes the action URL in the plain text body when provided", () => {
		const { text } = welcomeEmail({
			name: "Bob",
			actionUrl: "https://example.com/verify",
		});
		expect(text).toContain("https://example.com/verify");
	});

	it("omits the action URL from the plain text body when not provided", () => {
		const { text } = welcomeEmail({ name: "Bob" });
		expect(text).not.toContain("http");
	});

	it("includes a verify email button in the HTML when actionUrl is provided", () => {
		const { html } = welcomeEmail({
			name: "Bob",
			actionUrl: "https://example.com/verify",
		});
		expect(html).toContain("Verify Email");
		expect(html).toContain("https://example.com/verify");
	});

	it("omits the verify button from the HTML when actionUrl is not provided", () => {
		const { html } = welcomeEmail({ name: "Bob" });
		expect(html).not.toContain("Verify Email");
	});

	it("returns valid HTML structure", () => {
		const { html } = welcomeEmail({ name: "Charlie" });
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<body");
		expect(html).toContain("Charlie");
	});
});

// ─── passwordResetEmail ───────────────────────────────────────────────────────

describe("passwordResetEmail", () => {
	it("has the correct subject line", () => {
		const { subject } = passwordResetEmail({
			name: "Alice",
			actionUrl: "https://example.com/reset",
		});
		expect(subject).toBe("Reset your password");
	});

	it("includes the reset URL in the plain text body", () => {
		const { text } = passwordResetEmail({
			name: "Alice",
			actionUrl: "https://example.com/reset",
		});
		expect(text).toContain("https://example.com/reset");
	});

	it("mentions the expiry period in the plain text body", () => {
		const { text } = passwordResetEmail({
			name: "Alice",
			actionUrl: "https://example.com/reset",
		});
		expect(text).toContain("1 hour");
	});

	it("includes the user's name in the plain text body", () => {
		const { text } = passwordResetEmail({
			name: "Alice",
			actionUrl: "https://example.com/reset",
		});
		expect(text).toContain("Alice");
	});

	it("includes the standard sign-off in the plain text body", () => {
		const { text } = passwordResetEmail({
			name: "Alice",
			actionUrl: "https://example.com/reset",
		});
		expect(text).toContain("— The Team");
	});

	it("includes the reset URL in the HTML", () => {
		const { html } = passwordResetEmail({
			name: "Alice",
			actionUrl: "https://example.com/reset",
		});
		expect(html).toContain("https://example.com/reset");
		expect(html).toContain("Reset Password");
	});

	it("returns valid HTML structure", () => {
		const { html } = passwordResetEmail({
			name: "Alice",
			actionUrl: "https://example.com/reset",
		});
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<body");
	});
});

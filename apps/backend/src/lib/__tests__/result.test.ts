// Unit tests for the Result type and all combinators.
// Pure functions — no DB, no network, no mocks.

import {
	andThen,
	andThenAsync,
	err,
	isErr,
	isOk,
	map,
	match,
	ok,
	unwrap,
} from "@repo/shared";
import { describe, expect, it } from "vitest";

// ─── Constructors ────────────────────────────────────────────────────────────

describe("ok", () => {
	it("creates an Ok result", () => {
		expect(ok(42)).toEqual({ ok: true, value: 42 });
	});

	it("wraps any value including null and objects", () => {
		expect(ok(null)).toEqual({ ok: true, value: null });
		expect(ok({ id: "1" })).toEqual({ ok: true, value: { id: "1" } });
	});
});

describe("err", () => {
	it("creates an Err result", () => {
		expect(err("oops")).toEqual({ ok: false, error: "oops" });
	});

	it("wraps typed error objects", () => {
		const e = { type: "NOT_FOUND" as const, lookup: "abc" };
		expect(err(e)).toEqual({ ok: false, error: e });
	});
});

// ─── Guards ──────────────────────────────────────────────────────────────────

describe("isOk / isErr", () => {
	it("isOk returns true for Ok, false for Err", () => {
		expect(isOk(ok(1))).toBe(true);
		expect(isOk(err("x"))).toBe(false);
	});

	it("isErr returns true for Err, false for Ok", () => {
		expect(isErr(err("x"))).toBe(true);
		expect(isErr(ok(1))).toBe(false);
	});
});

// ─── Unwrap ───────────────────────────────────────────────────────────────────

describe("unwrap", () => {
	it("returns the value for an Ok result", () => {
		expect(unwrap(ok("hello"))).toBe("hello");
	});

	it("throws when called on an Err result", () => {
		expect(() => unwrap(err("bad"))).toThrow("Called unwrap on an Err result");
	});
});

// ─── map ─────────────────────────────────────────────────────────────────────

describe("map", () => {
	it("transforms the Ok value", () => {
		const result = map(ok(2), (n) => n * 3);
		expect(result).toEqual(ok(6));
	});

	it("passes Err through unchanged", () => {
		const original = err({ type: "NOT_FOUND" as const, lookup: "x" });
		const result = map(original, (n: number) => n * 3);
		expect(result).toEqual(original);
	});

	it("does not call fn on Err", () => {
		let called = false;
		map(err("e"), () => {
			called = true;
			return 0;
		});
		expect(called).toBe(false);
	});
});

// ─── andThen ─────────────────────────────────────────────────────────────────

describe("andThen", () => {
	it("chains the function when Ok", () => {
		const result = andThen(ok(5), (n) => ok(n + 1));
		expect(result).toEqual(ok(6));
	});

	it("short-circuits when the input is Err", () => {
		const original = err("input failed");
		const result = andThen(original, (n: number) => ok(n + 1));
		expect(result).toEqual(original);
	});

	it("propagates Err returned by the chained function", () => {
		const result = andThen(ok(5), () => err("chained failed"));
		expect(result).toEqual(err("chained failed"));
	});

	it("does not call fn on Err input", () => {
		let called = false;
		andThen(err("e"), () => {
			called = true;
			return ok(0);
		});
		expect(called).toBe(false);
	});
});

// ─── andThenAsync ─────────────────────────────────────────────────────────────

describe("andThenAsync", () => {
	it("chains the async function when Ok", async () => {
		const result = await andThenAsync(ok(5), async (n) => ok(n * 2));
		expect(result).toEqual(ok(10));
	});

	it("short-circuits when the input is Err", async () => {
		const original = err("input failed");
		const result = await andThenAsync(original, async (n: number) => ok(n));
		expect(result).toEqual(original);
	});

	it("propagates Err returned by the async function", async () => {
		const result = await andThenAsync(ok("x"), async () => err("async failed"));
		expect(result).toEqual(err("async failed"));
	});

	it("does not call fn on Err input", async () => {
		let called = false;
		await andThenAsync(err("e"), async () => {
			called = true;
			return ok(0);
		});
		expect(called).toBe(false);
	});
});

// ─── match ───────────────────────────────────────────────────────────────────

describe("match", () => {
	it("calls the ok handler for Ok results", () => {
		const result = match(ok(42), {
			ok: (n) => `value is ${n}`,
			err: () => "error",
		});
		expect(result).toBe("value is 42");
	});

	it("calls the err handler for Err results", () => {
		const result = match(err("bad"), {
			ok: () => "ok",
			err: (e) => `error: ${e}`,
		});
		expect(result).toBe("error: bad");
	});

	it("ok and err branches can return different types", () => {
		// This tests the R1 | R2 generic — both branches compile with distinct return types.
		const result = match(
			ok(1) as ReturnType<typeof ok<number>> | ReturnType<typeof err<string>>,
			{
				ok: (n) => n * 2, // number
				err: (e) => e.length, // also number, but from a different source
			},
		);
		expect(typeof result).toBe("number");
	});
});

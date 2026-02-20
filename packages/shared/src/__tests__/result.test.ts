import { describe, it, expect, vi } from "vitest";
import {
	ok,
	err,
	isOk,
	isErr,
	unwrap,
	map,
	andThen,
	andThenAsync,
	match,
} from "../result.js";

// ─── ok / err constructors ────────────────────────────────────────────────────

describe("ok", () => {
	it("creates an Ok result with the provided value", () => {
		const result = ok(42);
		expect(result).toEqual({ ok: true, value: 42 });
	});

	it("works with object values", () => {
		const result = ok({ id: "1", name: "Alice" });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value.name).toBe("Alice");
	});
});

describe("err", () => {
	it("creates an Err result with the provided error", () => {
		const result = err({ type: "NOT_FOUND" });
		expect(result).toEqual({ ok: false, error: { type: "NOT_FOUND" } });
	});

	it("ok property is false", () => {
		expect(err("oops").ok).toBe(false);
	});
});

// ─── Type guards ─────────────────────────────────────────────────────────────

describe("isOk", () => {
	it("returns true for Ok results", () => {
		expect(isOk(ok("yes"))).toBe(true);
	});

	it("returns false for Err results", () => {
		expect(isOk(err("no"))).toBe(false);
	});
});

describe("isErr", () => {
	it("returns true for Err results", () => {
		expect(isErr(err("bad"))).toBe(true);
	});

	it("returns false for Ok results", () => {
		expect(isErr(ok("good"))).toBe(false);
	});
});

// ─── unwrap ──────────────────────────────────────────────────────────────────

describe("unwrap", () => {
	it("returns the value from an Ok result", () => {
		expect(unwrap(ok("hello"))).toBe("hello");
	});

	it("throws when called on an Err result", () => {
		expect(() => unwrap(err("oh no"))).toThrow(
			"Called unwrap on an Err result",
		);
	});
});

// ─── map ─────────────────────────────────────────────────────────────────────

describe("map", () => {
	it("transforms the Ok value with the provided function", () => {
		const result = map(ok(2), (n) => n * 3);
		expect(result).toEqual(ok(6));
	});

	it("passes Err through without calling the function", () => {
		const fn = vi.fn();
		const result = map(err("fail"), fn);
		expect(result).toEqual(err("fail"));
		expect(fn).not.toHaveBeenCalled();
	});

	it("allows changing the value type", () => {
		const result = map(ok(42), (n) => String(n));
		expect(result).toEqual(ok("42"));
	});
});

// ─── andThen ─────────────────────────────────────────────────────────────────

describe("andThen", () => {
	it("chains the function on an Ok result", () => {
		const result = andThen(ok(4), (n) => ok(n * 2));
		expect(result).toEqual(ok(8));
	});

	it("short-circuits on an Err result without calling the function", () => {
		const fn = vi.fn();
		const result = andThen(err("first failure"), fn);
		expect(result).toEqual(err("first failure"));
		expect(fn).not.toHaveBeenCalled();
	});

	it("propagates an Err returned from the chained function", () => {
		const result = andThen(ok(0), (n) =>
			n === 0 ? err({ type: "DIVISION_BY_ZERO" }) : ok(1 / n),
		);
		expect(result).toEqual(err({ type: "DIVISION_BY_ZERO" }));
	});

	it("chains multiple operations together", () => {
		const double = (n: number) => ok(n * 2);
		const addOne = (n: number) => ok(n + 1);

		const result = andThen(andThen(ok(3), double), addOne);
		expect(result).toEqual(ok(7));
	});
});

// ─── andThenAsync ─────────────────────────────────────────────────────────────

describe("andThenAsync", () => {
	it("chains an async function on an Ok result", async () => {
		const result = await andThenAsync(ok(5), async (n) => ok(n * 2));
		expect(result).toEqual(ok(10));
	});

	it("short-circuits on an Err result without calling the function", async () => {
		const fn = vi.fn();
		const result = await andThenAsync(err("already failed"), fn);
		expect(result).toEqual(err("already failed"));
		expect(fn).not.toHaveBeenCalled();
	});

	it("propagates an async Err from the chained function", async () => {
		const result = await andThenAsync(ok("user"), async (_) =>
			err({ type: "CONFLICT", detail: "duplicate" }),
		);
		expect(result).toEqual(err({ type: "CONFLICT", detail: "duplicate" }));
	});
});

// ─── match ───────────────────────────────────────────────────────────────────

describe("match", () => {
	it("calls ok handler on an Ok result", () => {
		const output = match(ok(10), {
			ok: (n) => `value is ${n}`,
			err: (_) => "error",
		});
		expect(output).toBe("value is 10");
	});

	it("calls err handler on an Err result", () => {
		const output = match(err({ type: "NOT_FOUND" }), {
			ok: (_) => "found",
			err: (e) => `missing: ${e.type}`,
		});
		expect(output).toBe("missing: NOT_FOUND");
	});

	it("allows ok and err handlers to return different types", () => {
		// This tests the R1 | R2 type signature — the compiler allows distinct types.
		const result = match(
			ok(1) as ReturnType<typeof ok<number>> | ReturnType<typeof err<string>>,
			{
				ok: (n) => n + 1,
				err: (e) => e.toUpperCase(),
			},
		);
		// result is number | string
		expect(result).toBe(2);
	});

	it("does not call the err handler when result is Ok", () => {
		const errHandler = vi.fn(() => "should not run");
		match(ok("success"), {
			ok: (v) => v,
			err: errHandler,
		});
		expect(errHandler).not.toHaveBeenCalled();
	});

	it("does not call the ok handler when result is Err", () => {
		const okHandler = vi.fn(() => "should not run");
		match(err("oops"), {
			ok: okHandler,
			err: (e) => e,
		});
		expect(okHandler).not.toHaveBeenCalled();
	});
});

// Pure function — no DOM. Call with plain values.

import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { cn } from "../utils.ts";

describe("cn", () => {
	it("joins multiple class strings", () => {
		expect(cn("a", "b", "c")).toBe("a b c");
	});

	it("drops falsy values", () => {
		expect(cn("a", false, null, undefined, "b")).toBe("a b");
	});

	it("lets a later conflicting Tailwind class win", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});

	it("applies conditional classes via object syntax", () => {
		expect(cn("base", { active: true, disabled: false })).toBe("base active");
	});
});

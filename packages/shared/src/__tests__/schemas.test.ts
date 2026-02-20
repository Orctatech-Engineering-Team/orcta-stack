import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  paginationSchema,
  idParamSchema,
  apiSuccessSchema,
  apiErrorSchema,
} from "../schemas.js";

// ─── paginationSchema ─────────────────────────────────────────────────────────

describe("paginationSchema", () => {
  it("defaults page to 1 and limit to 20 when not provided", () => {
    const result = paginationSchema.parse({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it("coerces string numbers to integers", () => {
    const result = paginationSchema.parse({ page: "3", limit: "50" });
    expect(result).toEqual({ page: 3, limit: 50 });
  });

  it("rejects a limit greater than 100", () => {
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects non-positive page numbers", () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
    expect(() => paginationSchema.parse({ page: -1 })).toThrow();
  });

  it("accepts limit of exactly 100", () => {
    const result = paginationSchema.parse({ limit: 100 });
    expect(result.limit).toBe(100);
  });
});

// ─── idParamSchema ────────────────────────────────────────────────────────────

describe("idParamSchema", () => {
  it("accepts a valid id string", () => {
    const result = idParamSchema.parse({ id: "abc-123" });
    expect(result.id).toBe("abc-123");
  });

  it("rejects an empty string id", () => {
    expect(() => idParamSchema.parse({ id: "" })).toThrow();
  });

  it("rejects a missing id field", () => {
    expect(() => idParamSchema.parse({})).toThrow();
  });
});

// ─── apiSuccessSchema ─────────────────────────────────────────────────────────

describe("apiSuccessSchema", () => {
  it("validates a well-formed success response", () => {
    const schema = apiSuccessSchema(z.string());
    const result = schema.parse({ success: true, data: "hello" });
    expect(result).toEqual({ success: true, data: "hello" });
  });

  it("validates with an object data schema", () => {
    const schema = apiSuccessSchema(z.object({ id: z.string(), name: z.string() }));
    const result = schema.parse({ success: true, data: { id: "1", name: "Alice" } });
    expect(result.data.name).toBe("Alice");
  });

  it("rejects when success is false", () => {
    const schema = apiSuccessSchema(z.string());
    expect(() => schema.parse({ success: false, data: "hello" })).toThrow();
  });

  it("rejects when data does not match the inner schema", () => {
    const schema = apiSuccessSchema(z.number());
    expect(() => schema.parse({ success: true, data: "not a number" })).toThrow();
  });

  it("rejects when data is missing", () => {
    const schema = apiSuccessSchema(z.string());
    expect(() => schema.parse({ success: true })).toThrow();
  });
});

// ─── apiErrorSchema ───────────────────────────────────────────────────────────

describe("apiErrorSchema", () => {
  it("validates a well-formed error response", () => {
    const result = apiErrorSchema.parse({
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("NOT_FOUND");
  });

  it("accepts an optional details field", () => {
    const result = apiErrorSchema.parse({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: { field: "email", issue: "required" },
      },
    });
    expect(result.error.details).toEqual({ field: "email", issue: "required" });
  });

  it("rejects when success is true", () => {
    expect(() =>
      apiErrorSchema.parse({
        success: true,
        error: { code: "OOPS", message: "bad" },
      }),
    ).toThrow();
  });

  it("rejects when code is missing", () => {
    expect(() =>
      apiErrorSchema.parse({ success: false, error: { message: "oops" } }),
    ).toThrow();
  });

  it("rejects when message is missing", () => {
    expect(() =>
      apiErrorSchema.parse({ success: false, error: { code: "ERR" } }),
    ).toThrow();
  });
});

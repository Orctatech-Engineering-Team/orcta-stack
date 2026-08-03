// Schema/type-level tests — no DB connection. packages/db has no live client
// of its own (that lives in apps/backend/src/db); these tests validate the
// drizzle table definitions and drizzle-zod schemas in isolation.

import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
  insertUserSchema,
  selectUserSchema,
  userRoleEnum,
} from "../schema/users.ts";

// ─── userRoleEnum ───────────────────────────────────────────────────────────

describe("userRoleEnum", () => {
  it("has exactly buyer, seller, and admin", () => {
    expect(userRoleEnum.enumValues).toEqual(["buyer", "seller", "admin"]);
  });
});

// ─── insertUserSchema ───────────────────────────────────────────────────────

describe("insertUserSchema", () => {
  const validInsert = {
    id: "user-1",
    email: "alice@example.com",
    name: "Alice",
  };

  it("accepts a minimal valid insert, defaulting role-dependent fields", () => {
    expect(() => insertUserSchema.parse(validInsert)).not.toThrow();
  });

  it("accepts an explicit valid role", () => {
    const result = insertUserSchema.parse({ ...validInsert, role: "seller" });
    expect(result.role).toBe("seller");
  });

  it("rejects a role outside the enum", () => {
    expect(() => insertUserSchema.parse({ ...validInsert, role: "superadmin" }))
      .toThrow();
  });

  it("rejects when a required field is missing", () => {
    const { email: _email, ...withoutEmail } = validInsert;
    expect(() => insertUserSchema.parse(withoutEmail)).toThrow();
  });
});

// ─── selectUserSchema ───────────────────────────────────────────────────────

describe("selectUserSchema", () => {
  const validRow = {
    id: "user-1",
    email: "alice@example.com",
    name: "Alice",
    image: null,
    role: "buyer" as const,
    emailVerified: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  it("accepts a fully-populated valid row", () => {
    expect(() => selectUserSchema.parse(validRow)).not.toThrow();
  });

  it("rejects a row missing a required field", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = validRow;
    expect(() => selectUserSchema.parse(withoutCreatedAt)).toThrow();
  });

  it("rejects a role outside the enum", () => {
    expect(() => selectUserSchema.parse({ ...validRow, role: "root" }))
      .toThrow();
  });
});

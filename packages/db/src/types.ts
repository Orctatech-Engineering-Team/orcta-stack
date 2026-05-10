import type { Account, Session } from "./schema/sessions.ts";
import type { InsertUser, User } from "./schema/users.ts";

// Re-export schema types
export type { Account, InsertUser, Session, User };

// Database-specific types
export type UserRole = "user" | "admin";

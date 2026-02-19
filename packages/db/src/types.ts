import type { User, InsertUser } from "./schema/users.js";
import type { Session, Account } from "./schema/sessions.js";

// Re-export schema types
export type { User, InsertUser, Session, Account };

// Database-specific types
export type UserRole = "user" | "admin";

import type { Account, Session } from "./schema/sessions.js";
import type { InsertUser, User } from "./schema/users.js";

// Re-export schema types
export type { User, InsertUser, Session, Account };

// Database-specific types
export type UserRole = "user" | "admin";

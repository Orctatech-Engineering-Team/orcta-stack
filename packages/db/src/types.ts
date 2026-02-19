import type { User, InsertUser } from "./schema/users";
import type { Session, Account } from "./schema/sessions";

// Re-export schema types
export type { User, InsertUser, Session, Account };

// Common utility types
export type UserRole = "user" | "admin";

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

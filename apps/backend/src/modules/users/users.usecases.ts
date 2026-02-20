// Use-cases: functional core.
//
// Pure functions that receive already-loaded domain values and apply business rules.
// No DB imports, no async unless unavoidable, no HTTP.
// Testable by calling with plain values — no mocks, no DB setup.
import type { User } from "@repo/db/schema";
import { err, ok, type Result } from "@repo/shared";
import type { EmailUnchanged } from "./users.errors";

// Prepare an email change for a user.
//
// Rules:
//   - Rejects no-ops: providing the same email the user already has is a caller mistake.
//   - Ensures email verification is reset: a new email address must be re-verified.
//
// The handler is responsible for checking whether the new email is available
// (findUserByEmail) before applying this result to updateUser.
export function prepareEmailChange(
	user: User,
	newEmail: string,
): Result<{ email: string; emailVerified: false }, EmailUnchanged> {
	if (user.email === newEmail)
		return err({ type: "EMAIL_UNCHANGED", email: newEmail });

	return ok({ email: newEmail, emailVerified: false as const });
}

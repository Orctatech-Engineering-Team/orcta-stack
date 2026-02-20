// Repository pattern:
// - Never throws. All failures are encoded in the return type.
// - Infrastructure errors (DB down, bad connection) become InfrastructureError.
// - Domain errors (not found, conflict) are typed discriminated unions.
// - Callers destructure the Result and handle each branch — the compiler enforces exhaustiveness.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@repo/db/schema";
import { ok, err } from "@repo/shared";
import type { Result } from "@repo/shared";
import { InfrastructureError } from "@/lib/error";
import { tryInfra } from "@/lib/infra";
import type { User, InsertUser } from "@repo/db/schema";
import type { UserNotFound, EmailTaken } from "./users.errors";

export async function findUserById(
	id: string,
): Promise<Result<User, UserNotFound | InfrastructureError>> {
	const result = await tryInfra(`fetch user ${id}`, () =>
		db.query.users.findFirst({ where: eq(users.id, id) }),
	);
	if (!result.ok) return result;
	if (!result.value) return err({ type: "USER_NOT_FOUND", lookup: id });
	return ok(result.value);
}

export async function findUserByEmail(
	email: string,
): Promise<Result<User, UserNotFound | InfrastructureError>> {
	const result = await tryInfra(`fetch user by email`, () =>
		db.query.users.findFirst({ where: eq(users.email, email) }),
	);
	if (!result.ok) return result;
	if (!result.value) return err({ type: "USER_NOT_FOUND", lookup: email });
	return ok(result.value);
}

export async function createUser(
	data: InsertUser,
): Promise<Result<User, EmailTaken | InfrastructureError>> {
	// Check for existing email first — turns a DB constraint error into a typed domain error.
	const existing = await tryInfra(`check email ${data.email}`, () =>
		db.query.users.findFirst({ where: eq(users.email, data.email) }),
	);
	if (!existing.ok) return existing;
	if (existing.value) return err({ type: "EMAIL_TAKEN", email: data.email });

	const result = await tryInfra("create user", () =>
		db
			.insert(users)
			.values(data)
			.returning()
			.then((rows) => rows[0]),
	);
	if (!result.ok) return result;
	if (!result.value)
		return err(new InfrastructureError("Insert returned no rows"));
	return ok(result.value);
}

export async function updateUser(
	id: string,
	data: Partial<InsertUser>,
): Promise<Result<User, UserNotFound | InfrastructureError>> {
	const result = await tryInfra(`update user ${id}`, () =>
		db
			.update(users)
			.set(data)
			.where(eq(users.id, id))
			.returning()
			.then((rows) => rows[0]),
	);
	if (!result.ok) return result;
	if (!result.value) return err({ type: "USER_NOT_FOUND", lookup: id });
	return ok(result.value);
}

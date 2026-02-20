// Handlers: imperative shell.
//
// Each handler:
//   1. Reads validated input from context (routes.ts guarantees shape).
//   2. Calls the repository (or a use-case + repository for business logic).
//   3. Maps every Result branch to an HTTP response with match + switch.
//
// Rules:
//   - Never throws. All branches are covered.
//   - Infrastructure failures → 500. Domain errors → specific 4xx.
//   - match() handles the ok/err split.
//   - switch(e.type) inside the err branch covers each domain variant exhaustively.

import type { InsertUser } from "@repo/db/schema";
import { match } from "@repo/shared";
import type { AppRouteHandler } from "@/lib/types";
import {
	BAD_REQUEST,
	CONFLICT,
	FORBIDDEN,
	failure,
	INTERNAL_SERVER_ERROR,
	isInfraError,
	NOT_FOUND,
	OK,
	success,
} from "@/lib/types";
import type { GetMeRoute, GetUserByIdRoute, UpdateMeRoute } from "./routes";
import { findUserByEmail, findUserById, updateUser } from "./users.repository";
import { prepareEmailChange } from "./users.usecases";

// GET /users/me
//
// Simple: load the current user from the DB and return it.
// Shows the standard match + switch pattern for a single-error repository call.
export const getMeHandler: AppRouteHandler<GetMeRoute> = async (c) => {
	const userId = c.get("session").userId;
	const result = await findUserById(userId);

	return match(result, {
		ok: (user) => c.json(success(user), OK),
		err: (e) => {
			if (isInfraError(e))
				return c.json(
					failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }),
					INTERNAL_SERVER_ERROR,
				);
			switch (e.type) {
				case "USER_NOT_FOUND":
					return c.json(
						failure({ code: "NOT_FOUND", message: "User not found" }),
						NOT_FOUND,
					);
			}
		},
	});
};

// PATCH /users/me
//
// Complex: demonstrates the full functional core / imperative shell pattern.
//
// Imperative shell (this handler):
//   - Loads the current user from the repository.
//   - If email is changing, checks availability via findUserByEmail.
//   - Persists the validated changes via updateUser.
//
// Functional core (prepareEmailChange use-case):
//   - Rejects no-ops (same email provided).
//   - Ensures the email verification flag is reset.
//   - Pure function: receives data, returns Result — no DB calls.
export const updateMeHandler: AppRouteHandler<UpdateMeRoute> = async (c) => {
	const userId = c.get("user").id;
	const body = c.req.valid("json");

	// Load current user — the use-case needs it to apply business rules.
	const current = await findUserById(userId);
	if (!current.ok) {
		if (isInfraError(current.error))
			return c.json(
				failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }),
				INTERNAL_SERVER_ERROR,
			);
		return c.json(
			failure({ code: "NOT_FOUND", message: "User not found" }),
			NOT_FOUND,
		);
	}

	// If an email change is requested, run the use-case and check availability.
	let emailFields: { email: string; emailVerified: false } | undefined;
	if (body.email !== undefined) {
		// Pure rule: reject no-ops and derive the fields to persist.
		const prepared = prepareEmailChange(current.value, body.email);
		if (!prepared.ok) {
			return c.json(
				failure({
					code: "EMAIL_UNCHANGED",
					message: "Provided email is the same as current",
				}),
				BAD_REQUEST,
			);
		}

		// Imperative check: is the new email available?
		// findUserByEmail returns ok if email IS taken, err(USER_NOT_FOUND) if it's free.
		const emailCheck = await findUserByEmail(body.email);
		if (emailCheck.ok) {
			return c.json(
				failure({
					code: "EMAIL_TAKEN",
					message: "Email address is already in use",
				}),
				CONFLICT,
			);
		}
		if (isInfraError(emailCheck.error)) {
			return c.json(
				failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }),
				INTERNAL_SERVER_ERROR,
			);
		}
		// emailCheck.error.type === "USER_NOT_FOUND" — email is available.
		emailFields = prepared.value;
	}

	// Build the update payload. Spreading undefined = {} so emailFields is safe.
	const updatePayload: Partial<InsertUser> = {
		...(body.name !== undefined && { name: body.name }),
		...(body.image !== undefined && { image: body.image }),
		...emailFields,
	};

	// Nothing to update — return current user without a DB roundtrip.
	if (Object.keys(updatePayload).length === 0) {
		return c.json(success(current.value), OK);
	}

	const result = await updateUser(userId, updatePayload);
	return match(result, {
		ok: (user) => c.json(success(user), OK),
		err: (e) => {
			if (isInfraError(e))
				return c.json(
					failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }),
					INTERNAL_SERVER_ERROR,
				);
			switch (e.type) {
				case "USER_NOT_FOUND":
					return c.json(
						failure({ code: "NOT_FOUND", message: "User not found" }),
						NOT_FOUND,
					);
			}
		},
	});
};

// GET /users/:id  (admin only)
//
// Shows inline role enforcement — checked at the start of the handler
// rather than via a path-level middleware, avoiding ambiguous path matching
// with /users/me. All other logic is the same single-error match pattern.
export const getUserByIdHandler: AppRouteHandler<GetUserByIdRoute> = async (
	c,
) => {
	const currentUser = c.get("user");
	if (currentUser.role !== "admin") {
		return c.json(
			failure({ code: "FORBIDDEN", message: "Admin access required" }),
			FORBIDDEN,
		);
	}

	const { id } = c.req.valid("param");
	const result = await findUserById(id);

	return match(result, {
		ok: (user) => c.json(success(user), OK),
		err: (e) => {
			if (isInfraError(e))
				return c.json(
					failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }),
					INTERNAL_SERVER_ERROR,
				);
			switch (e.type) {
				case "USER_NOT_FOUND":
					return c.json(
						failure({ code: "NOT_FOUND", message: "User not found" }),
						NOT_FOUND,
					);
			}
		},
	});
};

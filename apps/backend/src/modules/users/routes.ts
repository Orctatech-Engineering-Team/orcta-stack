import { createRoute, z } from "@hono/zod-openapi";
import { selectUserSchema } from "@repo/db/schema";
import { apiErrorSchema, apiSuccessSchema, idParamSchema } from "@repo/shared";
import {
	BAD_REQUEST,
	CONFLICT,
	FORBIDDEN,
	INTERNAL_SERVER_ERROR,
	jsonBody,
	jsonRes,
	NOT_FOUND,
	OK,
	UNAUTHORIZED,
} from "@/lib/types";

const tags = ["Users"];

const userResponseSchema = apiSuccessSchema(selectUserSchema);

// PATCH /users/me body
const updateMeBodySchema = z.object({
	name: z.string().min(1).max(255).optional(),
	image: z.url().optional(),
	email: z.email().optional(),
});

// Shared error responses used across all three routes
const e401 = jsonRes(apiErrorSchema, "Unauthorized");
const e404 = jsonRes(apiErrorSchema, "User not found");
const e500 = jsonRes(apiErrorSchema, "Internal server error");

// ─── Routes ─────────────────────────────────────────────────────────────────

export const getMe = createRoute({
	method: "get",
	path: "/users/me",
	tags,
	summary: "Get current user",
	description: "Returns the authenticated user's profile.",
	responses: {
		[OK]: jsonRes(userResponseSchema, "Current user profile"),
		[UNAUTHORIZED]: e401,
		[NOT_FOUND]: e404,
		[INTERNAL_SERVER_ERROR]: e500,
	},
});

export const updateMe = createRoute({
	method: "patch",
	path: "/users/me",
	tags,
	summary: "Update current user",
	description:
		"Update name, image, or email. Changing email resets email verification and requires the address to be available.",
	request: {
		body: jsonBody(updateMeBodySchema),
	},
	responses: {
		[OK]: jsonRes(userResponseSchema, "Updated profile"),
		[BAD_REQUEST]: jsonRes(apiErrorSchema, "Email is unchanged"),
		[UNAUTHORIZED]: e401,
		[NOT_FOUND]: e404,
		[CONFLICT]: jsonRes(apiErrorSchema, "Email already taken"),
		[INTERNAL_SERVER_ERROR]: e500,
	},
});

export const getUserById = createRoute({
	method: "get",
	path: "/users/:id",
	tags,
	summary: "Get user by ID",
	description: "Admin only. Fetch any user's profile by their ID.",
	request: { params: idParamSchema },
	responses: {
		[OK]: jsonRes(userResponseSchema, "User found"),
		[UNAUTHORIZED]: e401,
		[FORBIDDEN]: jsonRes(apiErrorSchema, "Forbidden — admin access required"),
		[NOT_FOUND]: e404,
		[INTERNAL_SERVER_ERROR]: e500,
	},
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type GetMeRoute = typeof getMe;
export type UpdateMeRoute = typeof updateMe;
export type GetUserByIdRoute = typeof getUserById;

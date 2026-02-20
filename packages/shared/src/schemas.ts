import { z } from "zod";

// Pagination
export const paginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
});

// Common params
export const idParamSchema = z.object({
	id: z.string().min(1),
});

// Type exports
export type PaginationInput = z.infer<typeof paginationSchema>;
export type IdParam = z.infer<typeof idParamSchema>;

// ─── Canonical API response schemas ─────────────────────────────────────────
//
// These are the Zod representations of ApiSuccess<T> and ApiError.
// Import and use these in every route's `responses` block so the runtime
// schema and the TypeScript type are always in sync.
//
// Usage:
//   responses: {
//     200: { content: { "application/json": { schema: apiSuccessSchema(selectPostSchema) } } },
//     404: { content: { "application/json": { schema: apiErrorSchema } } },
//     500: { content: { "application/json": { schema: apiErrorSchema } } },
//   }

// Wraps any data schema in { success: true, data: T }.
export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		success: z.literal(true),
		data: dataSchema,
	});

// Fixed shape for all error responses: { success: false, error: { code, message, details? } }.
export const apiErrorSchema = z.object({
	success: z.literal(false),
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.record(z.string(), z.unknown()).optional(),
	}),
});

import { z } from "zod";

// ─── Pagination ──────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Convert parsed pagination input into `{ limit, offset }` for Drizzle queries.
 *
 * @example
 *   const { limit, offset } = paginationQuery(input);
 *   const rows = await db.query.posts.findMany({ limit, offset });
 */
export function paginationQuery(input: PaginationInput) {
	return {
		limit: input.limit,
		offset: (input.page - 1) * input.limit,
	};
}

/**
 * Wrap items + total count into the standard paginated response envelope.
 * Pass the same `input` you got from parsing the request query string.
 *
 * @example
 *   const [rows, [{ count }]] = await Promise.all([
 *     db.query.posts.findMany({ limit, offset }),
 *     db.select({ count: sql<number>`count(*)` }).from(posts),
 *   ]);
 *   return c.json(success(paginate(rows, Number(count), input)), OK);
 */
export function paginate<T>(items: T[], total: number, input: PaginationInput) {
	return {
		items,
		meta: {
			page: input.page,
			limit: input.limit,
			total,
			totalPages: Math.ceil(total / input.limit),
			hasMore: input.page * input.limit < total,
		},
	};
}

// Common params
export const idParamSchema = z.object({
	id: z.string().min(1),
});

// Type exports
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

/**
 * Response schema for paginated list endpoints.
 * Wrap any item schema to get a fully-typed { data: { items, meta } } envelope.
 *
 * @example
 *   responses: {
 *     [OK]: jsonRes(paginatedSuccessSchema(selectPostSchema), "List of posts"),
 *   }
 */
export const paginatedSuccessSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
	apiSuccessSchema(
		z.object({
			items: z.array(itemSchema),
			meta: z.object({
				page: z.number(),
				limit: z.number(),
				total: z.number(),
				totalPages: z.number(),
				hasMore: z.boolean(),
			}),
		}),
	);

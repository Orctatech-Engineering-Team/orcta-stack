// AppError — for known, expected failures that map to HTTP responses.
// Use in handlers when you need to communicate a specific error to the client.
export class AppError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly statusCode: number = 500,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "AppError";
	}

	static badRequest(message: string, details?: Record<string, unknown>) {
		return new AppError("BAD_REQUEST", message, 400, details);
	}
	static unauthorized(message = "Unauthorized") {
		return new AppError("UNAUTHORIZED", message, 401);
	}
	static forbidden(message = "Forbidden") {
		return new AppError("FORBIDDEN", message, 403);
	}
	static notFound(message = "Not found") {
		return new AppError("NOT_FOUND", message, 404);
	}
	static conflict(message: string) {
		return new AppError("CONFLICT", message, 409);
	}
	static internal(message = "Internal server error") {
		return new AppError("INTERNAL_ERROR", message, 500);
	}

	toJSON() {
		return {
			code: this.code,
			message: this.message,
			...(this.details && { details: this.details }),
		};
	}
}

// InfrastructureError — wraps throws from DB, Redis, storage, external APIs.
// Repositories catch unknown throws and re-wrap them here before returning Result.Err.
// Handlers that receive one as a result return 500; they don't re-throw.
// The global onError only sees these if they escape (a bug).
export class InfrastructureError extends Error {
	constructor(
		message: string,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "InfrastructureError";
	}
}

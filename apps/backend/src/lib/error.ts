// Application error types

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError("BAD_REQUEST", message, 400, details);
  }

  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError("FORBIDDEN", message, 403);
  }

  static notFound(message: string = "Not found"): AppError {
    return new AppError("NOT_FOUND", message, 404);
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", message, 409);
  }

  static internal(message: string = "Internal server error"): AppError {
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

// Infrastructure error for DB/external service failures
export class InfrastructureError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "InfrastructureError";
  }
}

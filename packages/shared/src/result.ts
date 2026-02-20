// Result type — the foundation of error handling without throwing.
//
// Rules:
// - Functions that can fail return Result<T, E>, never throw
// - Infrastructure failures (DB down, network) are InfrastructureError
// - Domain failures (not found, conflict) are typed discriminated unions
// - Handlers exhaust all error branches; the compiler enforces it

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

// Type guard helpers
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
	!result.ok;

// Unwrap — only use when you've already checked ok, or in tests
export const unwrap = <T, E>(result: Result<T, E>): T => {
	if (!result.ok) throw new Error("Called unwrap on an Err result");
	return result.value;
};

// Transform the Ok value, pass Err through unchanged.
// Use when you have a value and want to reshape it without branching.
//
// const result = map(await findUserById(id), (user) => user.email);
// Result<string, UserNotFound | InfrastructureError>
export const map = <T, E, U>(
	result: Result<T, E>,
	fn: (value: T) => U,
): Result<U, E> => (result.ok ? ok(fn(result.value)) : result);

// Chain a Result-returning function onto an Ok value.
// The first Err short-circuits the chain — no staircase of `if (!r.ok) return r`.
//
// return andThen(await findUserById(id), (user) =>
//   user.verified ? ok(user) : err({ type: "EMAIL_NOT_VERIFIED" })
// );
export const andThen = <T, E, U, F>(
	result: Result<T, E>,
	fn: (value: T) => Result<U, F>,
): Result<U, E | F> => (result.ok ? fn(result.value) : result);

// Async version of andThen — for chaining repository calls in use-cases.
//
// const user = await andThenAsync(await findUserById(userId), (user) =>
//   createPost({ authorId: user.id, ...input })
// );
export const andThenAsync = async <T, E, U, F>(
	result: Result<T, E>,
	fn: (value: T) => Promise<Result<U, F>>,
): Promise<Result<U, E | F>> => (result.ok ? fn(result.value) : result);

// Exhaustively handle both branches in one expression.
// Primary use: handlers mapping a Result to an HTTP response.
//
// ok and err may return different types — their union is the return type.
// This is intentional: Hono response types encode the status code, so
// c.json(success(user), 200) and c.json(failure(...), 404) are distinct types.
//
// return match(result, {
//   ok: (user) => c.json(success(user), 200),
//   err: (e) => isInfraError(e)
//     ? c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), 500)
//     : c.json(failure({ code: "NOT_FOUND", message: "User not found" }), 404),
// });
export const match = <T, E, R1, R2>(
	result: Result<T, E>,
	handlers: { ok: (value: T) => R1; err: (error: E) => R2 },
): R1 | R2 =>
	result.ok ? handlers.ok(result.value) : handlers.err(result.error);

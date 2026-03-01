/**
 * # Result<T, E>
 *
 * A small, explicit alternative to exceptions.
 *
 * Use `Result<T, E>` for any function that can fail. Callers must handle both
 * the success and failure branches, and TypeScript can enforce exhaustiveness
 * when `E` is a discriminated union.
 *
 * ## Conventions
 * - Functions that can fail return `Result<T, E>` (do **not** throw for expected failures).
 * - **Infrastructure failures** (DB down, network, timeouts) should be represented by a shared
 *   `InfrastructureError` type in your project.
 * - **Domain failures** should be typed, discriminated unions (e.g. `{ type: "USER_NOT_FOUND" }`).
 * - HTTP/handler boundaries should **exhaust** error branches (prefer `match`).
 *
 * ## Example
 * ```ts
 * type UserNotFound = { type: "USER_NOT_FOUND"; userId: string };
 * type EmailNotVerified = { type: "EMAIL_NOT_VERIFIED"; userId: string };
 * type UseCaseError = UserNotFound | EmailNotVerified | InfrastructureError;
 *
 * const result: Result<User, UseCaseError> = await findUserById(id);
 *
 * return match(result, {
 *   ok: (user) => user.email,
 *   err: (e) => {
 *     switch (e.type) {
 *       case "USER_NOT_FOUND": return "missing";
 *       case "EMAIL_NOT_VERIFIED": return "blocked";
 *       default: return "infra"; // if InfrastructureError is unioned in
 *     }
 *   },
 * });
 * ```
 */
export type Ok<T> = { ok: true; value: T };

/**
 * Failure branch of a `Result<T, E>`.
 *
 * Prefer `E` as a discriminated union:
 * `type DomainError = { type: "NOT_FOUND" } | { type: "CONFLICT" }`
 */
export type Err<E> = { ok: false; error: E };

/** Union representing either success (`Ok<T>`) or failure (`Err<E>`). */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Construct an `Ok<T>` result.
 *
 * @example
 * ```ts
 * return ok(user);
 * ```
 */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/**
 * Construct an `Err<E>` result.
 *
 * @example
 * ```ts
 * return err({ type: "USER_NOT_FOUND", userId });
 * ```
 */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Type guard: narrows `Result<T, E>` to `Ok<T>`. */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/** Type guard: narrows `Result<T, E>` to `Err<E>`. */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
  !result.ok;

/**
 * Unsafe unwrap of a `Result`.
 *
 * Use only when you have already established `result.ok === true`
 * (or in tests). Prefer `match`, `map`, or `andThen` in production code.
 *
 * @throws Error if called on `Err`.
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (!result.ok) throw new Error("Called unwrap on an Err result");
  return result.value;
};

/**
 * Map the success value, preserving the error type.
 *
 * Useful for reshaping data without branching:
 * - `Ok<T>` becomes `Ok<U>`
 * - `Err<E>` passes through unchanged
 *
 * @example
 * ```ts
 * const email = map(await findUserById(id), (u) => u.email);
 * // Result<string, UserNotFound | InfrastructureError>
 * ```
 */
export const map = <T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => (result.ok ? ok(fn(result.value)) : result);

/**
 * Flat-map / chain another `Result` onto an `Ok` value.
 *
 * Short-circuits on the first error (no `if (!r.ok) return r` staircase).
 * Error types are unioned: `Result<U, E | F>`.
 *
 * @example
 * ```ts
 * return andThen(await findUserById(id), (user) =>
 *   user.verified ? ok(user) : err({ type: "EMAIL_NOT_VERIFIED", userId: user.id })
 * );
 * ```
 */
export const andThen = <T, E, U, F>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> => (result.ok ? fn(result.value) : result);

/**
 * Async variant of `andThen`.
 *
 * @example
 * ```ts
 * const created = await andThenAsync(await findUserById(userId), (user) =>
 *   createPost({ authorId: user.id, ...input })
 * );
 * ```
 */
export const andThenAsync = async <T, E, U, F>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, F>>,
): Promise<Result<U, E | F>> => (result.ok ? fn(result.value) : result);

/**
 * Exhaustively handle both branches in a single expression.
 *
 * This is ideal at boundaries (HTTP handlers, controllers) where you want
 * one return statement and compiler-enforced handling of the `E` union.
 *
 * Note: the return types of `ok` and `err` handlers can differ; the function
 * returns their union (`R1 | R2`). This is useful with frameworks whose
 * response types encode status codes.
 *
 * @example
 * ```ts
 * return match(result, {
 *   ok: (user) => c.json(success(user), 200),
 *   err: (e) =>
 *     isInfraError(e)
 *       ? c.json(failure({ code: "INTERNAL_ERROR", message: "Service unavailable" }), 500)
 *       : c.json(failure({ code: "NOT_FOUND", message: "User not found" }), 404),
 * });
 * ```
 */
export const match = <T, E, R1, R2>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => R1; err: (error: E) => R2 },
): R1 | R2 =>
  result.ok ? handlers.ok(result.value) : handlers.err(result.error);

import { ok, err } from "@repo/shared";
import type { Result } from "@repo/shared";
import { InfrastructureError } from "./error";

// The single catch boundary for all repository operations.
// Wrap every DB/Redis/storage call in this — never catch anywhere else in a repository.
export async function tryInfra<T>(
	message: string,
	fn: () => Promise<T>,
): Promise<Result<T, InfrastructureError>> {
	try {
		return ok(await fn());
	} catch (cause) {
		return err(new InfrastructureError(message, cause));
	}
}

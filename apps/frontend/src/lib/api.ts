const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:9999";

// ─── Typed API error ──────────────────────────────────────────────────────────
// Thrown for any non-2xx response so callers can distinguish HTTP failures
// from network failures and check the status code programmatically.
//
// Example:
//   try { await api.post("/api/orders", data) }
//   catch (e) {
//     if (e instanceof ApiError && e.status === 409) handleConflict()
//   }
export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly body: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
// One function. No class. Uses the Fetch API directly — no third-party HTTP
// client. Credentials included by default (cookie-based auth).
async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${BASE_URL}${endpoint}`, {
		...init,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new ApiError(
			response.status,
			(body as { error?: { message?: string } })?.error?.message ??
				"Request failed",
			body,
		);
	}

	// 204 No Content — return undefined cast to T
	if (response.status === 204) return undefined as T;

	return response.json() as Promise<T>;
}

// ─── API surface ──────────────────────────────────────────────────────────────
// Plain object of functions. Tree-shakeable. Same interface as before.
export const api = {
	get: <T>(endpoint: string, init?: RequestInit) =>
		request<T>(endpoint, { ...init, method: "GET" }),

	post: <T>(endpoint: string, data?: unknown, init?: RequestInit) =>
		request<T>(endpoint, {
			...init,
			method: "POST",
			body: data !== undefined ? JSON.stringify(data) : undefined,
		}),

	put: <T>(endpoint: string, data?: unknown, init?: RequestInit) =>
		request<T>(endpoint, {
			...init,
			method: "PUT",
			body: data !== undefined ? JSON.stringify(data) : undefined,
		}),

	patch: <T>(endpoint: string, data?: unknown, init?: RequestInit) =>
		request<T>(endpoint, {
			...init,
			method: "PATCH",
			body: data !== undefined ? JSON.stringify(data) : undefined,
		}),

	delete: <T>(endpoint: string, init?: RequestInit) =>
		request<T>(endpoint, { ...init, method: "DELETE" }),
};

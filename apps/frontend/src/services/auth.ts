import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

// ─── Session query ────────────────────────────────────────────────────────────
// The canonical query for the current auth state. Used in two places:
//
//   1. Root route beforeLoad — prefetches/reuses session data for every
//      navigation so child routes always have context.session available.
//
//   2. Any component that needs to re-read the current user on demand.
//
// Key: ["auth", "session"]
// Invalidate this after any mutation that changes auth state (signIn, signOut,
// signUp) so the router re-syncs on the next navigation:
//
//   await queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey })
//   navigate({ to: "/dashboard" })
//
export const sessionQueryOptions = queryOptions({
	queryKey: ["auth", "session"] as const,
	queryFn: () => authClient.getSession().then((r) => r.data ?? null),
	// Session data is stable — don't refetch every 60 seconds.
	// better-auth refreshes the session server-side; we sync on navigation.
	staleTime: 1000 * 60 * 5, // 5 minutes
});

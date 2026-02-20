import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { sessionQueryOptions } from "@/services/auth";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	// Prefetch the session once at the root of the route tree.
	// Every child route receives context.session — no per-page auth fetch.
	// After any auth mutation (signIn, signOut, signUp), invalidate
	// sessionQueryOptions.queryKey and navigate; the router re-runs this.
	beforeLoad: async ({ context }) => {
		const session =
			await context.queryClient.ensureQueryData(sessionQueryOptions);
		return { session };
	},
	component: RootComponent,
});

function RootComponent() {
	return (
		<>
			<Outlet />
			<Toaster position="top-right" richColors />
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</>
	);
}

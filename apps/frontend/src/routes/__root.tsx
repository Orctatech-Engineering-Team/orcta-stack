import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { ErrorFallback } from "@/components/error-fallback";
import { sessionQueryOptions } from "@/services/auth";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	beforeLoad: async ({ context }) => {
		const session =
			await context.queryClient.ensureQueryData(sessionQueryOptions);
		return { session };
	},
	errorComponent: ErrorFallback,
	notFoundComponent: () => (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="text-center space-y-4">
				<h1 className="text-4xl font-bold">404</h1>
				<p className="text-muted-foreground">Page not found</p>
				<Link
					to="/"
					className="inline-block text-sm font-medium underline underline-offset-4 hover:text-(--color-foreground)"
				>
					Go home
				</Link>
			</div>
		</div>
	),
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

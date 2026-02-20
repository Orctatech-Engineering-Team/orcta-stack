import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { sessionQueryOptions } from "@/services/auth";

export const Route = createFileRoute("/dashboard")({
	// Auth guard. context.session was set by the root's beforeLoad.
	// If the user is not authenticated, redirect before the component mounts.
	// No loading spinner, no flash of unauthenticated content.
	beforeLoad: ({ context }) => {
		if (!context.session) {
			throw redirect({ to: "/login" });
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// session is typed as Session | null from the root beforeLoad.
	// The guard below should never be reached — beforeLoad throws redirect()
	// before this component renders if session is null. It satisfies TypeScript's
	// null narrowing without a non-null assertion.
	const { session } = Route.useRouteContext();
	if (!session) return null;

	const handleLogout = async () => {
		await authClient.signOut();
		// Invalidate the cached session so the root's beforeLoad re-fetches null
		// on the next navigation, keeping auth state consistent.
		await queryClient.invalidateQueries({
			queryKey: sessionQueryOptions.queryKey,
		});
		toast.success("Logged out successfully");
		navigate({ to: "/" });
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white border-b border-gray-200">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<h1 className="text-xl font-bold">Dashboard</h1>
					<div className="flex items-center gap-4">
						<span className="text-sm text-gray-600">{session.user.email}</span>
						<button
							type="button"
							onClick={handleLogout}
							className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Logout
						</button>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<div className="bg-white rounded-xl border border-gray-200 p-6">
					<h2 className="text-lg font-semibold mb-4">Welcome back!</h2>
					<p className="text-gray-600">
						You’re logged in as <strong>{session.user.name}</strong>.
					</p>

					<div className="mt-6 p-4 bg-gray-50 rounded-lg">
						<h3 className="font-medium mb-2">User Details</h3>
						<pre className="text-sm text-gray-600 overflow-auto">
							{JSON.stringify(session.user, null, 2)}
						</pre>
					</div>
				</div>
			</main>
		</div>
	);
}

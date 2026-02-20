import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	// The guard below should never be reached -- beforeLoad throws redirect()
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
		<div className="min-h-screen bg-(--color-background)">
			<header className="bg-(--color-card) border-b border-border">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<h1 className="text-xl font-bold">Dashboard</h1>
					<div className="flex items-center gap-4">
						<span className="text-sm text-muted-foreground">
							{session.user.email}
						</span>
						<Button
							variant="outline"
							size="sm"
							type="button"
							onClick={handleLogout}
						>
							Logout
						</Button>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<Card>
					<CardHeader>
						<CardTitle>Welcome back!</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-muted-foreground">
							You are logged in as{" "}
							<strong className="text-(--color-foreground)">
								{session.user.name}
							</strong>
							.
						</p>

						<div className="p-4 rounded-lg bg-(--color-muted)">
							<h3 className="text-sm font-medium mb-2">User Details</h3>
							<pre className="text-xs text-muted-foreground overflow-auto">
								{JSON.stringify(session.user, null, 2)}
							</pre>
						</div>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}

import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { sessionQueryOptions } from "@/services/auth";
import { toast } from "sonner";

const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export const Route = createFileRoute("/login")({
	// If the user is already authenticated, no need to show the login page.
	beforeLoad: ({ context }) => {
		if (context.session) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: { onChange: loginSchema },
		onSubmit: async ({ value }) => {
			const result = await authClient.signIn.email({
				email: value.email,
				password: value.password,
			});

			if (result.error) {
				toast.error(result.error.message ?? "Sign in failed");
				return;
			}

			// Sync the session cache so root's beforeLoad sees the new session
			// on the next navigation, keeping auth state consistent.
			await queryClient.invalidateQueries({
				queryKey: sessionQueryOptions.queryKey,
			});
			toast.success("Logged in successfully");
			navigate({ to: "/dashboard" });
		},
	});

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
					<p className="mt-2 text-gray-600">Sign in to your account</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="mt-8 space-y-6"
				>
					<div className="space-y-4">
						<form.Field name="email">
							{(field) => (
								<div>
									<label
										htmlFor="email"
										className="block text-sm font-medium text-gray-700"
									>
										Email
									</label>
									<input
										id="email"
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
										placeholder="you@example.com"
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="mt-1 text-sm text-red-600">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="password">
							{(field) => (
								<div>
									<label
										htmlFor="password"
										className="block text-sm font-medium text-gray-700"
									>
										Password
									</label>
									<input
										id="password"
										type="password"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
										placeholder="••••••••"
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="mt-1 text-sm text-red-600">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.Field>
					</div>

					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isSubmitting ? "Signing in..." : "Sign in"}
							</button>
						)}
					</form.Subscribe>
				</form>

				<p className="text-center text-sm text-gray-600">
					Don’t have an account?{" "}
					<Link to="/register" className="font-medium text-black hover:underline">
						Sign up
					</Link>
				</p>
			</div>
		</div>
	);
}

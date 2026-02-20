import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { sessionQueryOptions } from "@/services/auth";

const registerSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters"),
		email: z.string().email("Invalid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

export const Route = createFileRoute("/register")({
	// If the user is already authenticated, no need to show the registration page.
	beforeLoad: ({ context }) => {
		if (context.session) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: RegisterPage,
});

function RegisterPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const form = useForm({
		defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
		validators: { onChange: registerSchema },
		onSubmit: async ({ value }) => {
			const result = await authClient.signUp.email({
				email: value.email,
				password: value.password,
				name: value.name,
			});

			if (result.error) {
				toast.error(result.error.message ?? "Sign up failed");
				return;
			}

			// Sync the session cache so root\'s beforeLoad sees the new session.
			await queryClient.invalidateQueries({
				queryKey: sessionQueryOptions.queryKey,
			});
			toast.success("Account created successfully");
			navigate({ to: "/dashboard" });
		},
	});

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold text-gray-900">Create account</h2>
					<p className="mt-2 text-gray-600">Get started with Orcta Stack</p>
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
						<form.Field name="name">
							{(field) => (
								<div>
									<label
										htmlFor="name"
										className="block text-sm font-medium text-gray-700"
									>
										Name
									</label>
									<input
										id="name"
										type="text"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
										placeholder="John Doe"
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="mt-1 text-sm text-red-600">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.Field>

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
										placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="mt-1 text-sm text-red-600">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="confirmPassword">
							{(field) => (
								<div>
									<label
										htmlFor="confirmPassword"
										className="block text-sm font-medium text-gray-700"
									>
										Confirm Password
									</label>
									<input
										id="confirmPassword"
										type="password"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
										placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
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
								{isSubmitting ? "Creating account..." : "Create account"}
							</button>
						)}
					</form.Subscribe>
				</form>

				<p className="text-center text-sm text-gray-600">
					Already have an account?{" "}
					<Link to="/login" className="font-medium text-black hover:underline">
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}

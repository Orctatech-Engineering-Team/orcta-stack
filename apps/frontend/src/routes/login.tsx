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
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { sessionQueryOptions } from "@/services/auth";

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
		<div className="min-h-screen flex items-center justify-center bg-(--color-background) py-12 px-4">
			<div className="max-w-sm w-full space-y-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold">Welcome back</h2>
					<p className="mt-2 text-muted-foreground">Sign in to your account</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="mt-8 space-y-5"
				>
					<form.Field name="email">
						{(field) => (
							<div className="space-y-1.5">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="you@example.com"
									invalid={field.state.meta.errors.length > 0}
								/>
								<FieldError
									errors={field.state.meta.errors.map(
										(e) => e?.message ?? String(e),
									)}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="password">
						{(field) => (
							<div className="space-y-1.5">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Enter your password"
									invalid={field.state.meta.errors.length > 0}
								/>
								<FieldError
									errors={field.state.meta.errors.map(
										(e) => e?.message ?? String(e),
									)}
								/>
							</div>
						)}
					</form.Field>

					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<Button
								type="submit"
								disabled={isSubmitting}
								focusableWhenDisabled
								className="w-full"
							>
								{isSubmitting ? "Signing in..." : "Sign in"}
							</Button>
						)}
					</form.Subscribe>
				</form>

				<p className="text-center text-sm text-[var(--color-muted-foreground)]">
					Don't have an account?{" "}
					<Link
						to="/register"
						className="font-medium text-[var(--color-foreground)] hover:underline"
					>
						Sign up
					</Link>
				</p>
			</div>
		</div>
	);
}

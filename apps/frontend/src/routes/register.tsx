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

const registerSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters"),
		email: z.string().email("Invalid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const Route = createFileRoute("/register")({
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

			await queryClient.invalidateQueries({
				queryKey: sessionQueryOptions.queryKey,
			});
			toast.success("Account created successfully");
			navigate({ to: "/dashboard" });
		},
	});

	return (
		<div className="min-h-screen flex items-center justify-center bg-(--color-background) py-12 px-4">
			<div className="max-w-sm w-full space-y-8">
				<div className="text-center">
					<h2 className="text-3xl font-bold">Create account</h2>
					<p className="mt-2 text-muted-foreground">
						Get started with Orcta Stack
					</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="mt-8 space-y-5"
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-1.5">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									type="text"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="John Doe"
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
									placeholder="At least 8 characters"
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

					<form.Field name="confirmPassword">
						{(field) => (
							<div className="space-y-1.5">
								<Label htmlFor="confirmPassword">Confirm Password</Label>
								<Input
									id="confirmPassword"
									type="password"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Repeat your password"
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
								{isSubmitting ? "Creating account..." : "Create account"}
							</Button>
						)}
					</form.Subscribe>
				</form>

				<p className="text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link
						to="/login"
						className="font-medium text-(--color-foreground) hover:underline"
					>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}

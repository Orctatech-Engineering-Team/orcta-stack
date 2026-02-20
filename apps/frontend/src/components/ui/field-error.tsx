import { cn } from "@/lib/utils";

type FieldErrorProps = {
	errors: string[];
	className?: string;
};

function FieldError({ errors, className }: FieldErrorProps) {
	if (!errors.length) return null;
	return (
		<p
			role="alert"
			className={cn("text-xs text-destructive-text mt-0.5", className)}
		>
			{errors.join(", ")}
		</p>
	);
}

export { FieldError };

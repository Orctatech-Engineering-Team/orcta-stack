import { cn } from "@/lib/utils";

type InputProps = React.ComponentPropsWithRef<"input"> & {
	invalid?: boolean;
};

function Input({ className, type, invalid, ...props }: InputProps) {
	return (
		<input
			type={type}
			data-invalid={invalid || undefined}
			className={cn(
				"flex h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]",
				"focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-[var(--color-ring)]",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"transition-colors",
				invalid &&
					"border-[var(--color-destructive)] focus-visible:outline-[var(--color-destructive)]",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };

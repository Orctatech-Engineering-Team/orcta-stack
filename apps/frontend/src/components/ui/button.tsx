import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors select-none cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-[var(--color-ring)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
	{
		variants: {
			variant: {
				default:
					"bg-(--color-primary) text-(--color-primary-foreground) hover:bg-[var(--color-primary)]/90 active:bg-[var(--color-primary)]/80",
				secondary:
					"bg-(--color-secondary) text-(--color-secondary-foreground) border border-[var(--color-border)] hover:bg-[var(--color-accent)]",
				destructive:
					"bg-destructive text-[var(--color-destructive-foreground)] hover:bg-[var(--color-destructive)]/90 active:bg-[var(--color-destructive)]/80",
				outline:
					"border border-border bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
				ghost:
					"text-(--color-foreground) hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
				link: "text-(--color-primary) underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-8 rounded-md px-3 text-xs",
				lg: "h-11 rounded-md px-8",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonProps = React.ComponentPropsWithRef<typeof BaseButton> &
	VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
	return (
		<BaseButton
			className={cn(buttonVariants({ variant, size }), className)}
			{...props}
		/>
	);
}

export { Button, buttonVariants };

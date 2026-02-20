import { cn } from "@/lib/utils";

type LabelProps = React.ComponentPropsWithRef<"label">;

function Label({ className, ...props }: LabelProps) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: This component is meant to be used as a wrapper for form controls, so it may not always have a "for" attribute.
		<label
			className={cn(
				"text-sm font-medium leading-none text-(--color-foreground)",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };

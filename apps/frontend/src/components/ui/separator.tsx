import { cn } from "@/lib/utils";

type SeparatorProps = React.ComponentPropsWithRef<"div"> & {
	orientation?: "horizontal" | "vertical";
};

function Separator({
	orientation = "horizontal",
	className,
	...props
}: SeparatorProps) {
	return (
		// biome-ignore lint/a11y/useFocusableInteractive: The "separator" role is appropriate for this component, as it is purely decorative and does not have interactive behavior. It should not be focusable or interactive, so we can safely ignore this accessibility lint rule.
		// biome-ignore lint/a11y/useSemanticElements: The "separator" role is appropriate for this component, as it is purely decorative and does not have interactive behavior. Using a <div> with the "separator" role is semantically correct and does not require additional ARIA properties for orientation.
		<div
			// biome-ignore lint/a11y/useAriaPropsForRole: The "separator" role does not require additional ARIA properties for orientation, as it is purely decorative and does not have interactive behavior.
			role="separator"
			aria-orientation={orientation}
			className={cn(
				"shrink-0 bg-border",
				orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };

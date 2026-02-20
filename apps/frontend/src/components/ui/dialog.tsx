import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function DialogRoot(props: React.ComponentProps<typeof BaseDialog.Root>) {
	return <BaseDialog.Root {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof BaseDialog.Trigger>) {
	return <BaseDialog.Trigger {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof BaseDialog.Portal>) {
	return <BaseDialog.Portal {...props} />;
}

function DialogBackdrop({
	className,
	...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
	return (
		<BaseDialog.Backdrop
			className={cn(
				"fixed inset-0 min-h-dvh bg-black/50 transition-opacity duration-150",
				"data-starting-style:opacity-0 data-ending-style:opacity-0",
				// iOS Safari 26+: use absolute so it covers the viewport correctly
				"supports-[-webkit-touch-callout:none]:absolute",
				className,
			)}
			{...props}
		/>
	);
}

function DialogPopup({
	className,
	...props
}: React.ComponentProps<typeof BaseDialog.Popup>) {
	return (
		<BaseDialog.Popup
			className={cn(
				"fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
				"rounded-lg bg-(--color-background) p-6 text-(--color-foreground)",
				"outline outline-border shadow-lg",
				"transition-all duration-150",
				"data-starting-style:scale-95 data-starting-style:opacity-0",
				"data-ending-style:scale-95 data-ending-style:opacity-0",
				className,
			)}
			{...props}
		/>
	);
}

function DialogTitle({
	className,
	...props
}: React.ComponentProps<typeof BaseDialog.Title>) {
	return (
		<BaseDialog.Title
			className={cn(
				"text-lg font-semibold leading-none tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
	return (
		<BaseDialog.Description
			className={cn("text-sm text-muted-foreground mt-2 mb-6", className)}
			{...props}
		/>
	);
}

function DialogClose({
	className,
	children,
	...props
}: React.ComponentProps<typeof BaseDialog.Close>) {
	return (
		<BaseDialog.Close
			className={cn(
				"absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md",
				"text-muted-foreground hover:bg-(--color-accent) hover:text-(--color-foreground)",
				"focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-(--color-ring)",
				"transition-colors",
				className,
			)}
			aria-label="Close"
			{...props}
		>
			{children ?? <X className="h-4 w-4" />}
		</BaseDialog.Close>
	);
}

function DialogFooter({
	className,
	...props
}: React.ComponentPropsWithRef<"div">) {
	return (
		<div
			className={cn("flex items-center justify-end gap-3 mt-6", className)}
			{...props}
		/>
	);
}

const Dialog = {
	Root: DialogRoot,
	Trigger: DialogTrigger,
	Portal: DialogPortal,
	Backdrop: DialogBackdrop,
	Popup: DialogPopup,
	Title: DialogTitle,
	Description: DialogDescription,
	Close: DialogClose,
	Footer: DialogFooter,
};

export { Dialog };

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentPropsWithRef<"div">) {
	return (
		<div
			className={cn(
				"rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-sm",
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({
	className,
	...props
}: React.ComponentPropsWithRef<"div">) {
	return (
		<div
			className={cn("flex flex-col space-y-1.5 p-6", className)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentPropsWithRef<"h3">) {
	return (
		<h3
			className={cn(
				"text-lg font-semibold leading-none tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}

function CardDescription({
	className,
	...props
}: React.ComponentPropsWithRef<"p">) {
	return (
		<p
			className={cn("text-sm text-[var(--color-muted-foreground)]", className)}
			{...props}
		/>
	);
}

function CardContent({
	className,
	...props
}: React.ComponentPropsWithRef<"div">) {
	return <div className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({
	className,
	...props
}: React.ComponentPropsWithRef<"div">) {
	return (
		<div className={cn("flex items-center p-6 pt-0", className)} {...props} />
	);
}

export {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
};

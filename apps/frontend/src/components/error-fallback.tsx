import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type ErrorFallbackProps = {
	error: Error;
};

function ErrorFallback({ error }: ErrorFallbackProps) {
	const router = useRouter();

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="max-w-md w-full">
				<CardHeader>
					<CardTitle>Something went wrong</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						{error.message || "An unexpected error occurred"}
					</p>
					{import.meta.env.DEV && error.stack && (
						<pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
							{error.stack}
						</pre>
					)}
				</CardContent>
				<CardFooter>
					<Button onClick={() => router.invalidate()}>Try again</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

export { ErrorFallback };

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:9999",
});

export const { signIn, signUp, signOut, useSession } = authClient;

/**
 * Initiate a social OAuth sign-in.
 * The user is redirected to the provider and returns to `callbackURL` after auth.
 *
 * @example
 *   await signInWithProvider("google", "/dashboard");
 *   await signInWithProvider("github", "/dashboard");
 */
export function signInWithProvider(
	provider: "google" | "github",
	callbackURL = "/dashboard",
) {
	return authClient.signIn.social({ provider, callbackURL });
}

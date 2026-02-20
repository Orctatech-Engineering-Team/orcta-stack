import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db, schema } from "@/db";
import env from "@/env";

// Build social providers object — only include a provider when both its
// client ID and secret are present. Adding empty strings would cause silent
// OAuth failures, so we omit the provider entirely when vars are missing.
const socialProviders: Parameters<typeof betterAuth>[0]["socialProviders"] = {
	...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
		? {
				google: {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET,
				},
			}
		: {}),
	...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
		? {
				github: {
					clientId: env.GITHUB_CLIENT_ID,
					clientSecret: env.GITHUB_CLIENT_SECRET,
				},
			}
		: {}),
};

export const auth = betterAuth({
	plugins: [openAPI()],
	socialProviders,
	database: drizzleAdapter(db, {
		provider: "pg",
		// Map better-auth model names to the project's Drizzle table objects.
		// better-auth uses singular names (user, session, account, verification)
		// while the schema uses plural names (users, sessions, accounts, verifications).
		schema: {
			user: schema.users,
			session: schema.sessions,
			account: schema.accounts,
			verification: schema.verifications,
		},
	}),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	trustedOrigins: [env.FRONTEND_URL],
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: false,
				defaultValue: "user",
			},
		},
	},
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];

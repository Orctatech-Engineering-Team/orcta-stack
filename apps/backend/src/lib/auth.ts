import { hash, verify } from "@node-rs/argon2";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db, schema } from "@/db";
import { sendEmail } from "@/lib/email";
import { redis } from "@/lib/redis";
import { passwordResetEmail, welcomeEmail } from "@repo/email-templates";
import type { User as DbUser } from "@repo/db/schema";
import env from "@/env.ts";

const argon2Options = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
  algorithm: 2,
};

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

const secondaryStorage = redis
  ? {
    get: (key: string) => redis!.get(key),
    set: async (key: string, value: string, ttl?: number) => {
      if (ttl) await redis!.setex(key, ttl, value);
      else await redis!.set(key, value);
    },
    delete: async (key: string) => {
      await redis!.del(key);
    },
  }
  : undefined;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  plugins: [
    openAPI(),
    twoFactor({
      issuer: env.BETTER_AUTH_URL
        ? new URL(env.BETTER_AUTH_URL).hostname
        : "Orcta",
      totpOptions: {
        digits: 6,
        period: 30,
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
        storeBackupCodes: "encrypted",
      },
      trustDeviceMaxAge: 30 * 24 * 60 * 60,
      twoFactorCookieMaxAge: 600,
    }),
  ],
  socialProviders,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_URL],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 256,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const template = passwordResetEmail({ name: user.name, actionUrl: url });
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    },
    password: {
      hash: (password) => hash(password, argon2Options),
      verify: ({ password, hash: storedHash }) =>
        verify(storedHash, password, argon2Options),
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const template = welcomeEmail({ name: user.name, actionUrl: url });
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    },
    sendOnSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 15,
    },
  },
  secondaryStorage,
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    storage: "secondary-storage",
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "buyer",
      },
    },
  },
  advanced: {
    backgroundTasks: {
      handler: (promise) => {
        promise.catch(console.error);
      },
    },
  },
});

type BetterAuthSession = typeof auth.$Infer.Session;
type BetterUser = BetterAuthSession["user"];
export type Session = BetterAuthSession;
export type User = BetterUser & Pick<DbUser, "role">;

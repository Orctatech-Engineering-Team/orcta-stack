import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

// Load environment-specific .env file first (e.g. .env.test), then fall back to .env.
const nodeEnv = process.env.NODE_ENV ?? "development";
expand(config({ path: `.env.${nodeEnv}`, override: false }));
expand(config({ override: false }));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(9999),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:9999"),

  // URLs
  SERVER_URL: z.string().url().default("http://localhost:9999"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),

  // Redis (optional - for jobs, rate limiting, caching)
  REDIS_URL: z.string().optional(),

  // S3/R2 Storage (optional)
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

const env = parseEnv();
export default env;

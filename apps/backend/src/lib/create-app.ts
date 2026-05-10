import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";
import pino, { multistream } from "pino";
import { notFound, onError } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";
import env from "@/env.ts";
import type { Session, User } from "./auth.ts";
import type { WideEvent } from "./types.ts";

export type AppEnv = {
  Variables: {
    user: User;
    session: Session["session"];
    wideEvent: WideEvent;
  };
};

export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook,
  });
}

async function buildPinoInstance() {
  if (env.NODE_ENV === "development") {
    return pino({
      level: env.LOG_LEVEL,
      transport: { target: "pino-pretty", options: { colorize: true } },
    });
  }

  const stdoutStream = {
    write: (msg: string) => Deno.stdout.write(new TextEncoder().encode(msg)),
  };

  const streams: pino.StreamEntry[] = [
    { level: env.LOG_LEVEL, stream: stdoutStream },
  ];

  if (env.AXIOM_TOKEN && env.AXIOM_DATASET) {
    const { default: createAxiomStream } = await import("@axiomhq/pino");
    streams.push({
      level: "info",
      stream: await createAxiomStream({
        dataset: env.AXIOM_DATASET,
        token: env.AXIOM_TOKEN,
      }),
    });
  }

  return pino({ level: env.LOG_LEVEL }, multistream(streams));
}

export default async function createApp() {
  const app = createRouter();

  // Logging — hono-pino binds a per-request logger to context; wide-event
  // middleware uses this logger to emit the single canonical event.
  app.use(
    pinoLogger({
      pino: await buildPinoInstance(),
      // Suppress hono-pino's own per-request log — we emit the wide event instead
      http: false,
    }),
  );

  // Error handling
  app.onError(onError);
  app.notFound(notFound);

  return app;
}

export type AppType = Awaited<ReturnType<typeof createApp>>;

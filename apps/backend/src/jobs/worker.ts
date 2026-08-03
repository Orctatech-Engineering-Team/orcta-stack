import { type Job, Worker } from "bullmq";
import pino from "pino";
import { getRedis } from "@/lib/redis.ts";
import { sendEmail } from "@/lib/email.ts";
import { emailTemplates, type JobData, type JobName } from "./index.ts";

const logger = pino({ name: "worker" });

const processors: { [K in JobName]: (job: Job<JobData[K]>) => Promise<void> } =
  {
    async email(job) {
      const { to, template, props } = job.data;
      logger.info({ to, template }, "Processing email job");
      const { subject, html, text } = emailTemplates[template](props);
      await sendEmail({ to, subject, html, text });
    },
  };

function startWorker<T extends JobName>(name: T) {
  const worker = new Worker<JobData[T]>(
    name,
    (job) => processors[name](job as Job<JobData[T]>),
    // biome-ignore lint/suspicious/noExplicitAny: BullMQ accepts ioredis instances but types diverge
    { connection: getRedis() as any, concurrency: 5 },
  );
  worker.on(
    "completed",
    (job) => logger.info({ jobId: job.id, name }, "Job completed"),
  );
  worker.on(
    "failed",
    (job, err) =>
      logger.error({ jobId: job?.id, name, error: err.message }, "Job failed"),
  );
  return worker;
}

const workers = (["email"] as JobName[]).map(startWorker);

async function shutdown() {
  logger.info("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  Deno.exit(0);
}

Deno.addSignalListener("SIGTERM", shutdown);
Deno.addSignalListener("SIGINT", shutdown);

logger.info("Workers started");

import { Worker, Job } from "bullmq";
import { getRedis } from "@/lib/redis";
import type { JobData, JobName } from "./index";
import pino from "pino";

const logger = pino({ name: "worker" });

// Job processors
const processors: {
  [K in JobName]: (job: Job<JobData[K]>) => Promise<void>;
} = {
  async email(job) {
    const { to, template, data } = job.data;
    logger.info({ to, template }, "Processing email job");
    // TODO: Implement email sending
    // await sendEmail({ to, template, data });
  },

  async cleanup(job) {
    const { olderThanDays } = job.data;
    logger.info({ olderThanDays }, "Processing cleanup job");
    // TODO: Implement cleanup logic
  },

  async sync(job) {
    const { userId } = job.data;
    logger.info({ userId }, "Processing sync job");
    // TODO: Implement sync logic
  },
};

// Create workers
function startWorker<T extends JobName>(name: T) {
  const worker = new Worker<JobData[T]>(
    name,
    async (job) => {
      await processors[name](job as Job<JobData[T]>);
    },
    { connection: getRedis(), concurrency: 5 }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, name }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, name, error: err.message }, "Job failed");
  });

  return worker;
}

// Start all workers
logger.info("Starting workers...");

const workers = [
  startWorker("email"),
  startWorker("cleanup"),
  startWorker("sync"),
];

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

logger.info("Workers started");

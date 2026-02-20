import { type Job, Worker } from "bullmq";
import pino from "pino";
import { getRedis } from "@/lib/redis";
import type { JobData, JobName } from "./index";

const logger = pino({ name: "worker" });

const processors: { [K in JobName]: (job: Job<JobData[K]>) => Promise<void> } =
	{
		async email(job) {
			logger.info(
				{ to: job.data.to, template: job.data.template },
				"Processing email job",
			);
			// TODO: Implement email sending
		},
		async cleanup(job) {
			logger.info(
				{ olderThanDays: job.data.olderThanDays },
				"Processing cleanup job",
			);
			// TODO: Implement cleanup logic
		},
		async sync(job) {
			logger.info({ userId: job.data.userId }, "Processing sync job");
			// TODO: Implement sync logic
		},
	};

function startWorker<T extends JobName>(name: T) {
	const worker = new Worker<JobData[T]>(
		name,
		(job) => processors[name](job as Job<JobData[T]>),
		{ connection: getRedis() as any, concurrency: 5 },
	);
	worker.on("completed", (job) =>
		logger.info({ jobId: job.id, name }, "Job completed"),
	);
	worker.on("failed", (job, err) =>
		logger.error({ jobId: job?.id, name, error: err.message }, "Job failed"),
	);
	return worker;
}

const workers = (["email", "cleanup", "sync"] as JobName[]).map(startWorker);

async function shutdown() {
	logger.info("Shutting down workers...");
	await Promise.all(workers.map((w) => w.close()));
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

logger.info("Workers started");

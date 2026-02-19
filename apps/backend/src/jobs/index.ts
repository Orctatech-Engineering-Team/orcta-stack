import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";

// Define your job types
export type JobName = "email" | "cleanup" | "sync";

export interface JobData {
  email: { to: string; template: string; data: Record<string, unknown> };
  cleanup: { olderThanDays: number };
  sync: { userId: string };
}

// Create queues
function createQueue<T extends JobName>(name: T) {
  return new Queue<JobData[T]>(name, { connection: getRedis() });
}

// Export queues (lazy initialization)
let emailQueue: Queue<JobData["email"]> | null = null;
let cleanupQueue: Queue<JobData["cleanup"]> | null = null;
let syncQueue: Queue<JobData["sync"]> | null = null;

export function getEmailQueue() {
  if (!emailQueue) emailQueue = createQueue("email");
  return emailQueue;
}

export function getCleanupQueue() {
  if (!cleanupQueue) cleanupQueue = createQueue("cleanup");
  return cleanupQueue;
}

export function getSyncQueue() {
  if (!syncQueue) syncQueue = createQueue("sync");
  return syncQueue;
}

// Helper to add jobs
export async function addJob<T extends JobName>(
  name: T,
  data: JobData[T],
  options?: { delay?: number; priority?: number }
) {
  const queue = {
    email: getEmailQueue,
    cleanup: getCleanupQueue,
    sync: getSyncQueue,
  }[name]();

  return queue.add(name, data, {
    delay: options?.delay,
    priority: options?.priority,
    removeOnComplete: 100,
    removeOnFail: 1000,
  });
}

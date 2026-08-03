import { Queue } from "bullmq";
import { passwordResetEmail, welcomeEmail } from "@repo/email-templates";
import { getRedis } from "@/lib/redis";

export type EmailTemplateName = "welcome" | "passwordReset";

export type JobName = "email";

export interface JobData {
  email: {
    to: string;
    template: EmailTemplateName;
    props: { name: string; actionUrl?: string };
  };
}

// Shared template lookup — used by the worker to process queued jobs and by
// queueEmail's no-Redis fallback to send inline, so both paths build the same email.
export const emailTemplates: Record<
  EmailTemplateName,
  (props: { name: string; actionUrl?: string }) => ReturnType<typeof welcomeEmail>
> = {
  welcome: welcomeEmail,
  passwordReset: passwordResetEmail,
};

// Create queues
function createQueue<T extends JobName>(name: T) {
  // biome-ignore lint/suspicious/noExplicitAny: BullMQ accepts ioredis instances but types diverge
  return new Queue<JobData[T]>(name, { connection: getRedis() as any });
}

// Export queues (lazy initialization)
let emailQueue: Queue<JobData["email"]> | null = null;

export function getEmailQueue(): Queue<JobData["email"]> {
  if (!emailQueue) emailQueue = createQueue("email");
  return emailQueue;
}

// Helper to add jobs
export function addJob<T extends JobName>(
  name: T,
  data: JobData[T],
  options?: { delay?: number; priority?: number },
) {
  const queueMap = {
    email: getEmailQueue(),
  };

  const queue = queueMap[name];

  // Queue<any> collapses all generics so .add() accepts (string, data) without ExtractNameType inference errors
  // biome-ignore lint/suspicious/noExplicitAny: BullMQ ExtractNameType bug (github.com/taskforcesh/bullmq/issues/3369)
  const q = queue as unknown as Queue<any>;
  return q.add(name, data, {
    delay: options?.delay,
    priority: options?.priority,
    removeOnComplete: 100,
    removeOnFail: 1000,
  });
}

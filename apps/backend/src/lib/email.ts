import { Resend } from "resend";
import env from "@/env.ts";
import { redis } from "@/lib/redis";
import { addJob, emailTemplates, type JobData } from "@/jobs/index.ts";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    console.log("[email] no RESEND_API_KEY configured, logging instead");
    console.log("[email] to:", options.to);
    console.log("[email] subject:", options.subject);
    return;
  }

  const { error } = await resend.emails.send({
    from: `Orcta <noreply@${
      env.BETTER_AUTH_URL ? new URL(env.BETTER_AUTH_URL).hostname : "localhost"
    }>`,
    replyTo: "noreply@orctatech.com",
    ...options,
  });

  if (error) {
    console.error("[email] failed to send:", error);
  }
}

// Email and background jobs are independently optional batteries (RESEND_API_KEY
// vs REDIS_URL). Queue through BullMQ when Redis is configured; otherwise send
// inline so email keeps working without Redis, same as `sendEmail`'s own
// RESEND_API_KEY fallback.
export async function queueEmail(payload: JobData["email"]) {
  if (redis) {
    await addJob("email", payload);
    return;
  }
  const { subject, html, text } = emailTemplates[payload.template](
    payload.props,
  );
  await sendEmail({ to: payload.to, subject, html, text });
}

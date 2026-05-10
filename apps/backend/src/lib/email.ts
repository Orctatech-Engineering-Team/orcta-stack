import { Resend } from "resend";
import env from "@/env.ts";

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

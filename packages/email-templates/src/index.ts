export interface EmailTemplate {
	subject: string;
	html: string;
	text: string;
}

interface EmailProps {
	name: string;
	actionUrl?: string;
}

function baseTemplate(title: string, body: string): string {
	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto">
<h1 style="font-size:24px;margin-bottom:16px">${title}</h1>
${body}
<p style="margin-top:24px;color:#666">— The Team</p>
</body></html>`;
}

export function welcomeEmail({ name, actionUrl }: EmailProps): EmailTemplate {
	const button = actionUrl
		? `<p><a href="${actionUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Verify Email</a></p>`
		: "";

	return {
		subject: `Welcome, ${name}!`,
		html: baseTemplate(
			`Welcome, ${name}!`,
			`<p>Thanks for signing up.</p>${button}`,
		),
		text: `Welcome, ${name}!\n\nThanks for signing up.${actionUrl ? `\n\nVerify: ${actionUrl}` : ""}\n\n— The Team`,
	};
}

export function passwordResetEmail({
	name,
	actionUrl,
}: EmailProps): EmailTemplate {
	return {
		subject: "Reset your password",
		html: baseTemplate(
			"Reset your password",
			`
      <p>Hi ${name}, click below to reset your password. Link expires in 1 hour.</p>
      <p><a href="${actionUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Reset Password</a></p>
    `,
		),
		text: `Hi ${name},\n\nReset your password: ${actionUrl}\n\nLink expires in 1 hour.\n\n— The Team`,
	};
}

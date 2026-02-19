// Email template types and builders

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailProps {
  name: string;
  verifyUrl?: string;
}

export interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresIn: string;
}

// Simple template builders (you can swap these for React Email later)

export function welcomeEmail({ name, verifyUrl }: WelcomeEmailProps): EmailTemplate {
  const subject = `Welcome to Orcta Stack, ${name}!`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
        <h1>Welcome, ${name}!</h1>
        <p>Thanks for signing up. We're excited to have you on board.</p>
        ${verifyUrl ? `<p><a href="${verifyUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>` : ""}
        <p>Best regards,<br>The Team</p>
      </body>
    </html>
  `;

  const text = `Welcome, ${name}!\n\nThanks for signing up. We're excited to have you on board.\n\n${verifyUrl ? `Verify your email: ${verifyUrl}\n\n` : ""}Best regards,\nThe Team`;

  return { subject, html, text };
}

export function passwordResetEmail({ name, resetUrl, expiresIn }: PasswordResetEmailProps): EmailTemplate {
  const subject = "Reset Your Password";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
        <h1>Password Reset Request</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <p><a href="${resetUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
        <p>This link will expire in ${expiresIn}.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>Best regards,<br>The Team</p>
      </body>
    </html>
  `;

  const text = `Password Reset Request\n\nHi ${name},\n\nWe received a request to reset your password. Use this link to set a new password:\n${resetUrl}\n\nThis link will expire in ${expiresIn}.\n\nIf you didn't request this, you can safely ignore this email.\n\nBest regards,\nThe Team`;

  return { subject, html, text };
}

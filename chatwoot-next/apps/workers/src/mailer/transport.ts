// Source: ActionMailer in app/mailers/ (per-account SMTP via
// `inbox.channel` settings for email channels).
// Stub: returns a Nodemailer transport built from per-account/inbox SMTP
// credentials. Real implementation should look up the inbox's outgoing email
// configuration and pick the right authentication strategy (basic, OAuth, SES,
// SendGrid, etc.).
import nodemailer, { type Transporter } from 'nodemailer';

export function createTransport(_inboxId: number): Transporter {
  // Example shape once wired:
  // return nodemailer.createTransport({
  //   host: smtp.host,
  //   port: smtp.port,
  //   secure: smtp.secure,
  //   auth: { user: smtp.user, pass: smtp.pass },
  // });
  void nodemailer;
  throw new Error('not implemented');
}

// Re-exported so callers can type against the same `Transporter` instance.
export type { Transporter };
export { nodemailer };

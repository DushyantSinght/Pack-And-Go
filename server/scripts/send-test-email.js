// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Sends ONE real test email to prove SMTP works:   npm run email:test -- you@example.com
// Reads server/.env. Prints only masked addresses and error codes — never the password.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const { emailConfig, verifyEmailTransport, sendEmail, maskEmail } = await import('../services/notify.js');

const to = process.argv[2] || process.env.SMTP_USER;
const cfg = emailConfig();
if (!cfg.configured) {
  console.error(`❌ Email is not configured: ${cfg.errors.join('; ')}`);
  process.exit(1);
}
if (!to || !/@/.test(to)) {
  console.error('❌ Give a recipient:  npm run email:test -- you@example.com');
  process.exit(1);
}
console.log(`Checking SMTP login at ${cfg.host}:${cfg.port}…`);
const v = await verifyEmailTransport();
if (!v.ok) {
  console.error(`❌ SMTP login failed: ${v.code || v.reason}${v.responseCode ? ` (SMTP ${v.responseCode})` : ''}${v.code === 'EAUTH' ? ' — check SMTP_USER / SMTP_PASS (Gmail needs an App Password)' : ''}`);
  process.exit(1);
}
const status = await sendEmail({
  to,
  subject: 'Pack&Go email test',
  text: `This is a test email from your Pack&Go server (${new Date().toISOString()}).\n\nIf you can read this, email delivery works.`
});
if (status === 'sent') {
  console.log(`✅ The SMTP server accepted the email for ${maskEmail(to)}. Check that inbox (and spam) to confirm delivery.`);
  process.exit(0);
}
console.error(`❌ Email was not sent (${status}).`);
process.exit(1);

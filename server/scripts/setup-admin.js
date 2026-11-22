// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Creates (or confirms) the one fixed admin account and removes admin rights from every other account.
//
//   npm run admin:setup
//
// Reads ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD and MONGODB_URI from server/.env, or from the
// command's environment (which wins). ADMIN_PASSWORD is used only when the account is first
// created; an existing admin's password is never changed. Prints a masked email, never the password.
// The server runs the same check on every start, so this script is only needed to set up an admin
// without restarting the server (or against a production database from your machine).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const { ensureAdminAccount } = await import('../services/adminAccount.js');
const { maskEmail } = await import('../services/notify.js');

if (!process.env.ADMIN_EMAIL) {
  console.error('❌ Set ADMIN_EMAIL (and ADMIN_PASSWORD the first time) in server/.env or the environment.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packandgo');
try {
  const r = await ensureAdminAccount();
  const who = maskEmail(process.env.ADMIN_EMAIL.trim().toLowerCase());
  const messages = {
    created: `✅ Admin account created for ${who}.`,
    promoted: `✅ ${who} is now the admin.`,
    ok: `✅ ${who} is already the admin.`
  };
  if (!messages[r.status]) process.exitCode = 1;
  else console.log(messages[r.status] + (r.demoted ? ` Removed admin rights from ${r.demoted} other account(s).` : ''));
} finally {
  await mongoose.disconnect();
}

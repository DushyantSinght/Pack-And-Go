// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// The platform has exactly one admin: a fixed account configured on the server.
//
//   ADMIN_EMAIL     the admin's sign-in email (required)
//   ADMIN_NAME      display name (default "Admin")
//   ADMIN_PASSWORD  used only to CREATE the account the first time; later password
//                   changes made in the app are kept (it is never re-applied)
//
// Nobody can become admin by registering: signup refuses ADMIN_EMAIL, and signup/profile
// edits never set isAdmin. The password lives only in the server's environment
// (server/.env locally, the host's settings in production), never in the code.
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { passwordProblem } from './passwordPolicy.js';

const adminEmail = () => String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

/** True when this address belongs to the configured admin (so signup must refuse it). */
export const isReservedAdminEmail = (email) => !!adminEmail() && String(email || '').trim().toLowerCase() === adminEmail();

/**
 * Makes sure the configured admin account exists and is the only admin.
 * Creates it (verified) from ADMIN_PASSWORD if missing; never changes an existing password.
 * An existing account is promoted only if its email is verified, so an account someone else
 * registered with that address (before it was reserved) can't take over admin.
 * @returns {{ status: string, demoted?: number }}
 */
export const ensureAdminAccount = async ({ log = console } = {}) => {
  const email = adminEmail();
  if (!email) return { status: 'not_configured' };
  const name = String(process.env.ADMIN_NAME || 'Admin').trim().slice(0, 80) || 'Admin';
  const password = String(process.env.ADMIN_PASSWORD || '');

  let admin = await User.findOne({ email });
  let status;
  if (!admin) {
    if (!password) {
      log.error(`❌ Admin account ${email} doesn't exist yet: set ADMIN_PASSWORD to create it.`);
      return { status: 'missing_password' };
    }
    // At least 6 characters (the owner chooses the admin password; common ones are allowed).
    const problem = passwordProblem(password, { admin: true });
    if (problem) {
      log.error(`❌ Admin account NOT created: ${problem}`);
      return { status: 'weak_password' };
    }
    admin = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      userType: 'professional',
      isAdmin: true,
      emailVerified: true,
      acceptedTermsAt: new Date()
    });
    status = 'created';
  } else if (!admin.isAdmin) {
    if (!admin.emailVerified) {
      log.error(`❌ ${email} is registered but its email isn't verified, so it was NOT made admin. Verify it, then restart.`);
      return { status: 'unverified' };
    }
    await User.updateOne({ _id: admin._id }, { $set: { isAdmin: true } });
    status = 'promoted';
  } else {
    status = 'ok';
  }

  // Exactly one admin: remove admin rights from any other account (e.g. the old demo admin).
  // Accounts are not deleted or otherwise changed.
  const { modifiedCount: demoted } = await User.updateMany({ isAdmin: true, _id: { $ne: admin._id } }, { $set: { isAdmin: false } });
  if (demoted) log.log(`🔒 Removed admin rights from ${demoted} other account(s).`);
  return { status, demoted };
};

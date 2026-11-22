// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Password rules.
//   Everyone:  at least 6 characters (and at most 200).
//   Ordinary users also can't pick one of the most common passwords (e.g. 123456, demo1234).
//   The single admin account is exempt from the common-password list by the owner's choice
//   (its password is set through ADMIN_PASSWORD / the Account dialog by the owner only).
// Existing accounts are not affected: the rules are checked only when a password is set.

const COMMON = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '123123', '654321', '111111', '000000', '121212',
  'password', 'password1', 'password123', 'passw0rd', 'qwerty', 'qwerty123', 'abc123', 'abcdef', 'iloveyou',
  'admin', 'admin123', 'admin1234', 'administrator', 'welcome', 'welcome1', 'letmein', 'monkey', 'dragon',
  'demo1234', 'demo123', 'test123', 'test1234', 'changeme', 'packandgo', 'packandgo123'
]);

export const isCommonPassword = (pw) => COMMON.has(String(pw || '').trim().toLowerCase());

/**
 * Checks a NEW password. Returns an error message, or null when it is acceptable.
 * @param {string} pw
 * @param {{ admin?: boolean }} [opts] admin: the owner's admin account (common-password list not applied)
 */
export const passwordProblem = (pw, { admin = false } = {}) => {
  if (typeof pw !== 'string' || pw.length < 6) return 'Password must be at least 6 characters.';
  if (pw.length > 200) return 'Password is too long.';
  if (!admin && isCommonPassword(pw)) return 'That password is too common. Choose something harder to guess.';
  return null;
};

// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
/**
 * In-memory OTP store.
 * For production: replace with Redis + TTL.
 * Structure: { phone: { otp, expiresAt } }
 */
const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a 6-digit numeric OTP for the given phone number.
 * Stores it with an expiry timestamp and returns the code.
 */
export const generateOtp = (phone) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS });
  return otp;
};

/**
 * Verify OTP for the given phone number.
 * Returns true and deletes the entry if valid, false otherwise.
 */
export const verifyOtp = (phone, inputOtp) => {
  const record = otpStore.get(phone);
  if (!record) return { valid: false, reason: 'OTP not found. Please request a new one.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  if (record.otp !== inputOtp) {
    return { valid: false, reason: 'Incorrect OTP. Please try again.' };
  }
  otpStore.delete(phone); // One-time use
  return { valid: true };
};

/**
 * For dev/testing: peek at the current OTP for a phone (never expose in production).
 */
export const peekOtp = (phone) => {
  if (process.env.NODE_ENV !== 'development') return null;
  return otpStore.get(phone)?.otp || null;
};


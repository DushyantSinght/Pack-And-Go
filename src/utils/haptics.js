// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
/** Short vibration on phones that support it (Android). Silent everywhere else. */
export const haptic = (pattern = 12) => {
  try {
    if (navigator.vibrate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
};
export const HAPTIC = { tap: 10, success: [16, 40, 16], warn: [30, 60, 30], ring: [300, 180, 300, 180, 300] };

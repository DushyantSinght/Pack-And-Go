// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
/** True only for Razorpay test keys. Live keys (rzp_live_…) or no key → false. */
export const isRazorpayTestMode = (config) => !!config?.razorpay && /^rzp_test_/.test(String(config.key || ''));

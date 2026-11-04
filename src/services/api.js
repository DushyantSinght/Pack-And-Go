// Client-side API Service — connects the Frontend to the Express/MongoDB backend
// Automatically attaches JWT token to all authenticated requests.

const BASE_URL = '/api';

// ── Token helpers ────────────────────────────────────────────────
export const tokenStorage = {
  get: () => localStorage.getItem('pkg_token'),
  set: (t) => localStorage.setItem('pkg_token', t),
  clear: () => localStorage.removeItem('pkg_token')
};

const authHeaders = () => {
  const token = tokenStorage.get();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const handleResponse = async (res) => {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || errorJson.error || `HTTP error ${res.status}`);
  }
  return res.json();
};

export const api = {
  // ── Database health & Schema Inspector ──────────────────────────
  getDBStatus: async () => {
    try {
      const res = await fetch(`${BASE_URL}/database/status`);
      return await handleResponse(res);
    } catch (err) {
      return { success: false, isConnected: false, error: err.message };
    }
  },

  getDBSchema: async () => {
    const res = await fetch(`${BASE_URL}/database/schema`);
    return await handleResponse(res);
  },

  reseedDatabase: async (force = true) => {
    const res = await fetch(`${BASE_URL}/database/seed`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ force })
    });
    return await handleResponse(res);
  },

  // ── Authentication ───────────────────────────────────────────────

  /**
   * Request an OTP to be sent to a phone number.
   * In development mode, the server returns { devOtp } in the response.
   */
  sendOtp: async (phone) => {
    const res = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    return await handleResponse(res);
  },

  /**
   * Login with phone + OTP (primary) or email + password (fallback).
   * Stores the returned JWT automatically.
   */
  login: async (credentials) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await handleResponse(res);
    if (data.token) tokenStorage.set(data.token);
    return data;
  },

  /**
   * Signup with name, phone, OTP (+ optional email, password, userType).
   * Stores the returned JWT automatically.
   */
  signup: async (userData) => {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await handleResponse(res);
    if (data.token) tokenStorage.set(data.token);
    return data;
  },

  /**
   * Get the current authenticated user's profile.
   */
  getMe: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders() });
    return await handleResponse(res);
  },

  /**
   * Sign out — clears local token.
   */
  logout: () => {
    tokenStorage.clear();
  },

  getUsers: async () => {
    const res = await fetch(`${BASE_URL}/auth/users`, { headers: authHeaders() });
    return await handleResponse(res);
  },

  // ── Active Move & Estimates ──────────────────────────────────────
  getCurrentMove: async () => {
    const res = await fetch(`${BASE_URL}/moves/current`, { headers: authHeaders() });
    return await handleResponse(res);
  },

  saveMoveEstimate: async (moveData) => {
    const res = await fetch(`${BASE_URL}/moves`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(moveData)
    });
    return await handleResponse(res);
  },

  verifyOtp: async (data) => {
    const res = await fetch(`${BASE_URL}/moves/verify-otp`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  // ── Digital Luggage Passports ────────────────────────────────────
  getPassports: async () => {
    const res = await fetch(`${BASE_URL}/passports`, { headers: authHeaders() });
    return await handleResponse(res);
  },

  createPassport: async (boxData) => {
    const res = await fetch(`${BASE_URL}/passports`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(boxData)
    });
    return await handleResponse(res);
  },

  updatePassport: async (boxId, updateData) => {
    const res = await fetch(`${BASE_URL}/passports/${boxId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(updateData)
    });
    return await handleResponse(res);
  },

  // ── Circular Marketplace ─────────────────────────────────────────
  getMarketplaceItems: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.society && filters.society !== 'All') params.append('society', filters.society);
    const url = `${BASE_URL}/marketplace${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, { headers: authHeaders() });
    return await handleResponse(res);
  },

  createMarketplaceItem: async (itemData) => {
    const res = await fetch(`${BASE_URL}/marketplace`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(itemData)
    });
    return await handleResponse(res);
  },

  claimMarketplaceItem: async (itemId) => {
    const res = await fetch(`${BASE_URL}/marketplace/${itemId}/claim`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    return await handleResponse(res);
  },

  // ── Pooled Corridors ─────────────────────────────────────────────
  getCorridors: async () => {
    const res = await fetch(`${BASE_URL}/corridors`, { headers: authHeaders() });
    return await handleResponse(res);
  },

  verifyCorridorStop: async (corridorId, stopId) => {
    const res = await fetch(`${BASE_URL}/corridors/${corridorId}/verify-stop`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ stopId })
    });
    return await handleResponse(res);
  },

  // ── Campus Hubs ──────────────────────────────────────────────────
  getCampusHubs: async () => {
    const res = await fetch(`${BASE_URL}/campus`, { headers: authHeaders() });
    return await handleResponse(res);
  },

  joinCampusHub: async (hubId, studentData) => {
    const res = await fetch(`${BASE_URL}/campus/${hubId}/join`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(studentData)
    });
    return await handleResponse(res);
  },

  // ── Payments (Razorpay) ──────────────────────────────────────────

  /**
   * Create a Razorpay order on the server.
   * Returns { order: { id, amount, currency }, key }.
   * @param {string} bookingId
   * @param {number} amountInPaise  e.g. ₹1890 → 189000
   */
  createPaymentOrder: async (bookingId, amountInPaise) => {
    const res = await fetch(`${BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ bookingId, amount: amountInPaise })
    });
    return await handleResponse(res);
  },

  /**
   * Verify a completed Razorpay payment by HMAC signature.
   * Call this from the Razorpay success handler.
   */
  verifyPayment: async (paymentData) => {
    const res = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(paymentData)
    });
    return await handleResponse(res);
  },

  /**
   * Get the payment and escrow status for a booking.
   */
  getPaymentStatus: async (bookingId) => {
    const res = await fetch(`${BASE_URL}/payments/status/${bookingId}`, {
      headers: authHeaders()
    });
    return await handleResponse(res);
  }
};

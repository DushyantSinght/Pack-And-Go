// Pack&Go API Service — connects frontend to Express/MongoDB backend.
// Automatically attaches JWT from localStorage to all authenticated requests.

const BASE_URL = '/api';

// ── Token storage helpers ────────────────────────────────────────
export const tokenStorage = {
  get: () => localStorage.getItem('pkg_token'),
  set: (t) => localStorage.setItem('pkg_token', t),
  clear: () => localStorage.removeItem('pkg_token')
};

const authHeaders = () => {
  const token = tokenStorage.get();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (HTTP ${res.status})`);
  }
  return data;
};

export const api = {

  // ── Database ─────────────────────────────────────────────────────
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
    return handleResponse(res);
  },

  reseedDatabase: async (force = true) => {
    const res = await fetch(`${BASE_URL}/database/seed`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ force })
    });
    return handleResponse(res);
  },

  // ── Authentication ────────────────────────────────────────────────

  /**
   * Login with email + password.
   * Stores the returned JWT automatically.
   */
  login: async ({ email, password }) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(res);
    if (data.token) tokenStorage.set(data.token);
    return data;
  },

  /**
   * Sign up with name + email + password + userType.
   * Stores the returned JWT automatically.
   */
  signup: async ({ name, email, password, userType, college, society, phone }) => {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, userType, college, society, phone })
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
    return handleResponse(res);
  },

  /**
   * Sign out — clears local token.
   */
  logout: () => tokenStorage.clear(),

  getUsers: async () => {
    const res = await fetch(`${BASE_URL}/auth/users`, { headers: authHeaders() });
    return handleResponse(res);
  },

  // ── Move Bookings ─────────────────────────────────────────────────
  getCurrentMove: async () => {
    const res = await fetch(`${BASE_URL}/moves/current`, { headers: authHeaders() });
    return handleResponse(res);
  },

  saveMoveEstimate: async (moveData) => {
    const res = await fetch(`${BASE_URL}/moves`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(moveData)
    });
    return handleResponse(res);
  },

  verifyOtp: async (data) => {
    const res = await fetch(`${BASE_URL}/moves/verify-otp`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // ── Luggage Passports ─────────────────────────────────────────────
  getPassports: async () => {
    const res = await fetch(`${BASE_URL}/passports`, { headers: authHeaders() });
    return handleResponse(res);
  },

  createPassport: async (boxData) => {
    const res = await fetch(`${BASE_URL}/passports`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(boxData)
    });
    return handleResponse(res);
  },

  updatePassport: async (boxId, updateData) => {
    const res = await fetch(`${BASE_URL}/passports/${boxId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  // ── Circular Marketplace ──────────────────────────────────────────
  getMarketplaceItems: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.society && filters.society !== 'All') params.append('society', filters.society);
    const url = `${BASE_URL}/marketplace${params.size ? '?' + params : ''}`;
    const res = await fetch(url, { headers: authHeaders() });
    return handleResponse(res);
  },

  createMarketplaceItem: async (itemData) => {
    const res = await fetch(`${BASE_URL}/marketplace`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(itemData)
    });
    return handleResponse(res);
  },

  claimMarketplaceItem: async (itemId) => {
    const res = await fetch(`${BASE_URL}/marketplace/${itemId}/claim`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    return handleResponse(res);
  },

  // ── Pooled Corridors ──────────────────────────────────────────────
  getCorridors: async () => {
    const res = await fetch(`${BASE_URL}/corridors`, { headers: authHeaders() });
    return handleResponse(res);
  },

  verifyCorridorStop: async (corridorId, stopId) => {
    const res = await fetch(`${BASE_URL}/corridors/${corridorId}/verify-stop`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ stopId })
    });
    return handleResponse(res);
  },

  // ── Campus Hubs ───────────────────────────────────────────────────
  getCampusHubs: async () => {
    const res = await fetch(`${BASE_URL}/campus`, { headers: authHeaders() });
    return handleResponse(res);
  },

  joinCampusHub: async (hubId, studentData) => {
    const res = await fetch(`${BASE_URL}/campus/${hubId}/join`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(studentData)
    });
    return handleResponse(res);
  },

  // ── Payments (Razorpay) ───────────────────────────────────────────

  /**
   * Create a Razorpay order. Returns { order: { id, amount, currency }, key }.
   * @param {string} bookingId
   * @param {number} amountInPaise  e.g. ₹1890 → 189000
   */
  createPaymentOrder: async (bookingId, amountInPaise) => {
    const res = await fetch(`${BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ bookingId, amount: amountInPaise })
    });
    return handleResponse(res);
  },

  /**
   * Verify Razorpay payment signature server-side.
   */
  verifyPayment: async (paymentData) => {
    const res = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
  },

  getPaymentStatus: async (bookingId) => {
    const res = await fetch(`${BASE_URL}/payments/status/${bookingId}`, {
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  // ── Chat (real-time delivery happens over Socket.IO) ─────────────
  startConversation: async ({ contextType, refId, userId }) => {
    const res = await fetch(`${BASE_URL}/chat/conversations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ contextType, refId, userId })
    });
    return handleResponse(res);
  },

  getConversations: async () => {
    const res = await fetch(`${BASE_URL}/chat/conversations`, { headers: authHeaders() });
    return handleResponse(res);
  },

  getMessages: async (conversationId) => {
    const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages`, { headers: authHeaders() });
    return handleResponse(res);
  },

  sendMessage: async (conversationId, text, kind = 'text') => {
    const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text, kind })
    });
    return handleResponse(res);
  },

  markConversationRead: async (conversationId) => {
    const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: authHeaders()
    });
    return handleResponse(res);
  }
};

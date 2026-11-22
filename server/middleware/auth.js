// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, RevokedToken } from '../models/index.js';

// Read lazily: ES module imports run before dotenv.config() in server.js,
// so a module-level constant would silently ignore JWT_SECRET from .env.
const getSecret = () => process.env.JWT_SECRET || 'packandgo_jwt_secret_dev_2026';

export const verifyToken = (token) => jwt.verify(token, getSecret());

/**
 * Signs a 7-day token for a user. Each token carries its own id (jti) so it can be signed out on
 * its own, and the user's tokenVersion so a password change or reset ends every older session.
 */
export const signToken = (user) =>
  jwt.sign(
    { _id: user._id, email: user.email, userType: user.userType, tv: user.tokenVersion || 0, jti: crypto.randomUUID() },
    getSecret(),
    { expiresIn: '7d' }
  );

/**
 * Verifies a token AND checks it is still a live session: the account exists, its password hasn't
 * changed since (tokenVersion), and this token wasn't signed out. Returns the decoded payload or null.
 */
export const checkSession = async (token) => {
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return null;
  }
  const [user, revoked] = await Promise.all([
    User.findById(decoded._id).select('tokenVersion isBlocked').lean(),
    decoded.jti ? RevokedToken.exists({ jti: decoded.jti }) : null
  ]);
  if (!user || revoked || user.isBlocked) return null;
  if ((user.tokenVersion || 0) !== (decoded.tv || 0)) return null;
  return decoded;
};

/** Records a token as signed out until it would have expired. */
export const revokeToken = async (decoded) => {
  if (!decoded?.jti) return;
  const expiresAt = new Date((decoded.exp || Math.floor(Date.now() / 1000) + 7 * 86400) * 1000);
  await RevokedToken.updateOne({ jti: decoded.jti }, { $setOnInsert: { expiresAt } }, { upsert: true });
};

const bearer = (req) => {
  const h = req.headers.authorization;
  return h && h.startsWith('Bearer ') ? h.slice(7) : null;
};

/**
 * Middleware: Require a valid, live session.
 * Attaches decoded { _id, email, userType, tv, jti, exp } to req.user.
 */
export const requireAuth = async (req, res, next) => {
  const token = bearer(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }
  try {
    const decoded = await checkSession(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Optionally attach user if a live session token is present, but don't block.
 * Useful for routes that behave differently when authenticated.
 */
export const optionalAuth = async (req, res, next) => {
  const token = bearer(req);
  try {
    req.user = token ? await checkSession(token) : null;
  } catch {
    req.user = null;
  }
  next();
};

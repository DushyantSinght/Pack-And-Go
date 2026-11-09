import jwt from 'jsonwebtoken';

// Read lazily: ES module imports run before dotenv.config() in server.js,
// so a module-level constant would silently ignore JWT_SECRET from .env.
const getSecret = () => process.env.JWT_SECRET || 'packandgo_jwt_secret_dev_2026';

export const verifyToken = (token) => jwt.verify(token, getSecret());

/**
 * Middleware: Require a valid Bearer JWT to proceed.
 * Attaches decoded { _id, email, userType } to req.user.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
  }
};

/**
 * Middleware: Optionally attach user if token present, but don't block.
 * Useful for routes that behave differently when authenticated.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(authHeader.split(' ')[1]);
    } catch {
      req.user = null;
    }
  }
  next();
};

export const signToken = (payload) => {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
};


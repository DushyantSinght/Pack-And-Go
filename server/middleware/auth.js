import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'packandgo_jwt_secret_dev_2026';

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
    const decoded = jwt.verify(token, JWT_SECRET);
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
      req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
};

export const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};


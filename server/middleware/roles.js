// Role checks that read the user from the database on every request, so an
// approval, rejection or suspension takes effect immediately (JWTs are 7 days).
import { User } from '../models/index.js';

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const isAdminUser = (user) => !!user && (user.isAdmin === true || adminEmails().includes(user.email));

export const captainStatusOf = (user) =>
  user?.userType === 'captain' ? user.captain?.status || 'pending' : 'none';

/** Public profile shape returned by login / signup / me. */
export const profileOf = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  userType: user.userType,
  college: user.college,
  society: user.society,
  escrowWalletBalance: user.escrowWalletBalance,
  tripsCompleted: user.tripsCompleted,
  rating: user.rating,
  createdAt: user.createdAt,
  isAdmin: isAdminUser(user),
  emailVerified: !!user.emailVerified,
  captainStatus: captainStatusOf(user),
  ...(user.userType === 'captain' && {
    captainApplication: {
      vehicleNumber: user.captain?.vehicleNumber,
      vehicleType: user.captain?.vehicleType,
      appliedAt: user.captain?.appliedAt,
      reviewNote: user.captain?.reviewNote
    }
  })
});

const loadUser = async (req) => {
  if (!req.dbUser) req.dbUser = await User.findById(req.user?._id);
  return req.dbUser;
};

export const requireAdmin = async (req, res, next) => {
  const user = await loadUser(req).catch(() => null);
  if (!isAdminUser(user)) return res.status(403).json({ success: false, message: 'Admins only.' });
  next();
};

export const requireApprovedCaptain = async (req, res, next) => {
  const user = await loadUser(req).catch(() => null);
  if (user?.userType !== 'captain') {
    return res.status(403).json({ success: false, message: 'Only Move Captains can do this.' });
  }
  const status = captainStatusOf(user);
  if (status !== 'approved') {
    const why = {
      pending: 'Your Move Captain application is still under review.',
      rejected: 'Your Move Captain application was not approved.',
      suspended: 'Your Move Captain account is suspended. Contact Pack&Go support.'
    };
    return res.status(403).json({ success: false, code: `captain_${status}`, message: why[status] || 'Captain account not approved.' });
  }
  next();
};

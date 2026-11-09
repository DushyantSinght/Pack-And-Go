// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import bcrypt from 'bcryptjs';
import { User, PooledCorridor, MarketplaceItem } from '../models/index.js';

// Every seeded account can sign in with this password so you can open a second
// browser window as the driver / seller and reply to chats and calls for real.
export const DEMO_PASSWORD = 'demo1234';

// People a customer can contact from the UI. Emails link listings & corridors to
// real user accounts so messages are delivered to whoever is logged in as them.
export const CONTACT_ACCOUNTS = [
  { name: 'Pack&Go Ops Admin', email: 'admin@packandgo.in', phone: '9876500001', userType: 'professional', isAdmin: true },
  { name: 'Demo User', email: 'demo@packandgo.in', phone: '9876500000', userType: 'student', college: 'BITS Pilani', society: 'HSR Layout Sector 1, Bengaluru' },
  { name: 'Manjunath Gowda', email: 'captain.manju@packandgo.in', phone: '9845211029', userType: 'captain', tripsCompleted: 1420, rating: 4.9, captain: { status: 'approved', licenseNumber: 'KA0120150012345', vehicleNumber: 'KA01MJ4921', vehicleType: 'Tata Ace EV', reviewedBy: 'admin@packandgo.in' }, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', corridorId: 'blr-koramangala-whitefield' },
  { name: 'Harpreet Singh', email: 'captain.harpreet@packandgo.in', phone: '9811044219', userType: 'captain', tripsCompleted: 980, rating: 4.85, captain: { status: 'approved', licenseNumber: 'DL0420160098765', vehicleNumber: 'DL1LAB2207', vehicleType: 'Ashok Leyland Dost CNG', reviewedBy: 'admin@packandgo.in' }, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', corridorId: 'del-campus-cybercity' },
  { name: 'Ananya Roy', email: 'ananya.roy@packandgo.in', phone: '9876511029', userType: 'outgoing', sellerName: 'Ananya Roy (Moving to London)' },
  { name: 'Tanmay Jain', email: 'tanmay.jain@packandgo.in', phone: '9811044218', userType: 'outgoing', sellerName: 'Tanmay Jain (Graduating)' },
  { name: 'Karthik Nair', email: 'karthik.nair@packandgo.in', phone: '9920144013', userType: 'outgoing', sellerName: 'Karthik Nair (Relocating to Gurgaon)' },
  { name: 'Simran Walia', email: 'simran.walia@packandgo.in', phone: '9845099881', userType: 'outgoing', sellerName: 'Simran Walia' },
  { name: 'Vikramaditya S.', email: 'vikram.s@packandgo.in', phone: '9820012345', userType: 'outgoing', sellerName: 'Vikramaditya S.' }
];

/**
 * Idempotent: creates any missing contact accounts, gives password-less seeded
 * users the demo password, and links corridors / listings to account emails.
 * Safe to run on every server start.
 */
export const ensureDemoAccounts = async () => {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const acct of CONTACT_ACCOUNTS) {
    const { corridorId, sellerName, ...profile } = acct;
    const existing = await User.findOne({ email: profile.email }).select('+password');
    if (!existing) {
      await User.create({ ...profile, password: hash, emailVerified: true, acceptedTermsAt: new Date() });
    } else if (!existing.password || !(await bcrypt.compare(DEMO_PASSWORD, existing.password))) {
      // Fixture accounts only: keep them on the documented demo password.
      existing.password = hash;
      if (!existing.phone) existing.phone = profile.phone;
      await existing.save();
    }
    if (existing) {
      const fix = {};
      if (profile.avatar && existing.avatar !== profile.avatar) fix.avatar = profile.avatar;
      if (profile.isAdmin && !existing.isAdmin) fix.isAdmin = true;
      if (!existing.emailVerified) fix.emailVerified = true; // fixture inboxes don't exist
      // Fixture drivers start approved (only if staff haven't reviewed them since).
      if (profile.captain && (!existing.captain?.status || existing.captain.status === 'none')) {
        fix.captain = { ...profile.captain, appliedAt: existing.createdAt, reviewedAt: new Date() };
      }
      if (Object.keys(fix).length) await User.updateOne({ _id: existing._id }, { $set: fix });
    }

    if (corridorId) {
      await PooledCorridor.updateOne(
        { corridorId },
        { $set: { 'driver.email': profile.email, 'driver.phone': `+91 ${profile.phone.slice(0, 5)} ${profile.phone.slice(5)}` } }
      );
    }
    if (sellerName) {
      await MarketplaceItem.updateMany(
        { 'seller.name': sellerName },
        { $set: { 'seller.email': profile.email, 'seller.phone': `+91 ${profile.phone.slice(0, 5)} ${profile.phone.slice(5)}` } }
      );
    }
  }

  // Any other existing captain account predates vetting — put it in the review queue.
  await User.updateMany(
    { userType: 'captain', $or: [{ 'captain.status': { $exists: false } }, { 'captain.status': 'none' }] },
    { $set: { 'captain.status': 'pending', 'captain.appliedAt': new Date() } }
  );

  // Older seeds created users without passwords — let them sign in too.
  await User.updateMany({ $or: [{ password: null }, { password: { $exists: false } }] }, { $set: { password: hash } });
};

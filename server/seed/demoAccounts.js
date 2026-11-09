import bcrypt from 'bcryptjs';
import { User, PooledCorridor, MarketplaceItem } from '../models/index.js';

// Every seeded account can sign in with this password so you can open a second
// browser window as the driver / seller and reply to chats and calls for real.
export const DEMO_PASSWORD = 'demo1234';

// People a customer can contact from the UI. Emails link listings & corridors to
// real user accounts so messages are delivered to whoever is logged in as them.
export const CONTACT_ACCOUNTS = [
  { name: 'Demo User', email: 'demo@packandgo.in', phone: '9876500000', userType: 'student', college: 'BITS Pilani', society: 'HSR Layout Sector 1, Bengaluru' },
  { name: 'Manjunath Gowda', email: 'captain.manju@packandgo.in', phone: '9845211029', userType: 'captain', tripsCompleted: 1420, rating: 4.9, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', corridorId: 'blr-koramangala-whitefield' },
  { name: 'Harpreet Singh', email: 'captain.harpreet@packandgo.in', phone: '9811044219', userType: 'captain', tripsCompleted: 980, rating: 4.85, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', corridorId: 'del-campus-cybercity' },
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
      await User.create({ ...profile, password: hash });
    } else if (!existing.password || !(await bcrypt.compare(DEMO_PASSWORD, existing.password))) {
      // Fixture accounts only: keep them on the documented demo password.
      existing.password = hash;
      if (!existing.phone) existing.phone = profile.phone;
      await existing.save();
    }
    if (existing && profile.avatar && existing.avatar !== profile.avatar) {
      await User.updateOne({ _id: existing._id }, { $set: { avatar: profile.avatar } });
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

  // Older seeds created users without passwords — let them sign in too.
  await User.updateMany({ $or: [{ password: null }, { password: { $exists: false } }] }, { $set: { password: hash } });
};

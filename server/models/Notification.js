import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'info' }, // booking, payment, driver, chat, claim, account, info
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, maxlength: 1000 },
    bookingId: String,
    read: { type: Boolean, default: false, index: true },
    channels: { email: String, sms: String } // delivery result per channel: sent | skipped | failed | logged
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import mongoose from 'mongoose';

const damageClaimSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, unique: true },
    bookingId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, index: true },
    captainEmail: String,
    boxIds: [String],
    description: { type: String, required: true, maxlength: 2000 },
    amountClaimed: { type: Number, min: 0, max: 200000 },
    photos: [{ type: String }], // data URLs, max 3 × ~1.5MB, validated in route
    status: { type: String, enum: ['open', 'under_review', 'approved', 'rejected', 'paid'], default: 'open', index: true },
    resolution: { note: String, amountApproved: Number, by: String, at: Date }
  },
  { timestamps: true }
);

export const DamageClaim = mongoose.model('DamageClaim', damageClaimSchema);

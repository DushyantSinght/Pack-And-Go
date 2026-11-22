// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Sign-in tokens that were signed out before they expired. MongoDB removes each entry
// automatically once the token would have expired anyway (TTL index on expiresAt).
import mongoose from 'mongoose';

const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

export const RevokedToken = mongoose.models.RevokedToken || mongoose.model('RevokedToken', revokedTokenSchema);

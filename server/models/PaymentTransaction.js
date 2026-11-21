// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Ledger of SIMULATED money movements (academic demo — no real money is ever involved).
// One row per event: a payment attempt (successful or failed), a refund, or a captain payout.
import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    txnId: { type: String, required: true, unique: true }, // e.g. DEMO-PAY-7F3A9C21B4E0
    kind: { type: String, enum: ['payment', 'refund', 'payout', 'compensation'], required: true }, // compensation = approved damage claim
    status: { type: String, enum: ['success', 'failed'], required: true },
    bookingId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, index: true }, // customer (payment/refund) or captain (payout)
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: ['demo_card', 'demo_upi', 'system'], default: 'system' },
    reason: { type: String, maxlength: 300 },
    relatedTxnId: String, // refund → the payment it reverses; compensation → the claim id
    simulated: { type: Boolean, default: true, immutable: true } // always true: there is no real gateway
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ createdAt: -1 });

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

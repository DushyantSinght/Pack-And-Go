// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import mongoose from 'mongoose';
import crypto from 'crypto';

export const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

const itemSchema = new mongoose.Schema(
  {
    id: Number,
    name: { type: String, required: true },
    category: { type: String, default: 'General' },
    cuFt: { type: Number, default: 10 },
    weightKg: { type: Number, default: 15 },
    fragile: { type: Boolean, default: false },
    box: [Number]
  },
  { _id: false }
);

const cartonsSchema = new mongoose.Schema(
  {
    small: { type: Number, default: 2 },
    medium: { type: Number, default: 4 },
    large: { type: Number, default: 2 },
    wardrobe: { type: Number, default: 1 }
  },
  { _id: false }
);

const moveBookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userEmail: {
      type: String,
      required: true,
      index: true
    },
    userName: {
      type: String,
      default: 'Guest Mover'
    },
    userPhone: {
      type: String,
      default: '9876543210'
    },
    origin: {
      type: String,
      required: [true, 'Origin address is required'],
      default: 'HSR Layout Sector 1, Bengaluru'
    },
    destination: {
      type: String,
      required: [true, 'Destination address is required'],
      default: 'Hope Farm, Whitefield, Bengaluru'
    },
    presetId: {
      type: String,
      default: 'studio-pg'
    },
    items: [itemSchema],
    totalCuFt: {
      type: Number,
      required: true,
      default: 115
    },
    estimatedWeightKg: {
      type: Number,
      default: 190
    },
    cartons: {
      type: cartonsSchema,
      default: () => ({ small: 2, medium: 4, large: 2, wardrobe: 1 })
    },
    labour: {
      type: String,
      default: '1 Move Captain + 1 Helper (2.5 hrs)'
    },
    vehicle: {
      type: String,
      default: 'Tata Ace Mini-Truck'
    },
    soloPrice: {
      type: Number,
      required: true,
      default: 5800
    },
    pooledPrice: {
      type: Number,
      required: true,
      default: 3190
    },
    savingsPercent: {
      type: Number,
      default: 45
    },
    isPriceLocked: {
      type: Boolean,
      default: true
    },
    // Random per booking. Only ever returned to the booking owner, who reads
    // them out to the Move Captain at pickup / delivery.
    pickupOtp: {
      type: String,
      default: generateOtp
    },
    deliveryOtp: {
      type: String,
      default: generateOtp
    },
    assignedCaptainEmail: { type: String, lowercase: true, trim: true, index: true },
    pickupVerifiedAt: Date,
    deliveredAt: Date,
    otpFailedAttempts: { type: Number, default: 0 },
    otpLockedUntil: Date,
    transitStatus: {
      type: String,
      default: 'In Transit • 34 km/h • Geofence Validated'
    },
    selectedTheme: {
      type: String,
      default: 'theme-urban-tech'
    },
    selectedEssentials: {
      type: [String],
      default: ['ess-water', 'ess-bedding', 'ess-grocery']
    },
    escrowStatus: {
      type: String,
      enum: ['pending', 'escrow_locked', 'in_transit', 'released_to_captain', 'refunded'],
      default: 'pending'
    },
    // Real payment state — nothing is "paid" until the gateway confirms it.
    paymentDetails: {
      status: { type: String, enum: ['unpaid', 'paid', 'refunded', 'partially_refunded'], default: 'unpaid' },
      method: String,
      amountPaid: { type: Number, default: 0 },
      transactionId: String,
      razorpayOrderId: String,
      paidAt: Date,
      testMode: { type: Boolean, default: false },
      refundId: String,
      refundAmount: Number,
      refundedAt: Date
    },
    // Booking lifecycle
    status: {
      type: String,
      enum: ['draft', 'pending_payment', 'confirmed', 'assigned', 'in_transit', 'delivered', 'cancelled'],
      default: 'draft',
      index: true
    },
    moveDate: Date,
    timeSlot: String,
    originLocation: { lat: Number, lng: Number },
    destinationLocation: { lat: Number, lng: Number },
    distanceKm: Number,
    floorsOrigin: { type: Number, default: 0 },
    floorsDestination: { type: Number, default: 0 },
    hasLiftOrigin: { type: Boolean, default: true },
    hasLiftDestination: { type: Boolean, default: true },
    notes: { type: String, maxlength: 500 },
    priceBreakdown: {
      base: Number,
      volume: Number,
      distance: Number,
      floors: Number,
      subtotal: Number,
      poolingDiscount: Number,
      gst: Number,
      total: Number
    },
    assignedAt: Date,
    captainPayout: { amount: Number, creditedAt: Date },
    driverLocation: { lat: Number, lng: Number, speedKmh: Number, heading: Number, updatedAt: Date },
    nearbyNotifiedAt: Date,
    cancellation: { at: Date, reason: String, refundPercent: Number, by: String },
    rescheduledCount: { type: Number, default: 0 },
    review: { rating: { type: Number, min: 1, max: 5 }, comment: String, at: Date },
    depositProtection: {
      certificateNumber: { type: String, default: 'PKG-DEP-ESCROW-8841' },
      depositAmount: { type: Number, default: 30000 },
      landlordProtected: { type: Boolean, default: true },
      inspectionPassed: { type: Boolean, default: true },
      verifiedAt: { type: Date, default: Date.now }
    }
  },
  {
    timestamps: true
  }
);

export const MoveBooking = mongoose.model('MoveBooking', moveBookingSchema);

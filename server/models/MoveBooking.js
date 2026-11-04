import mongoose from 'mongoose';

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
    pickupOtp: {
      type: String,
      default: '582941'
    },
    deliveryOtp: {
      type: String,
      default: '910283'
    },
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
      default: 'escrow_locked'
    },
    paymentDetails: {
      status: { type: String, default: 'Escrow Secured' },
      method: { type: String, default: 'UPI Autopay' },
      amountPaid: { type: Number, default: 3190 },
      transactionId: { type: String, default: 'UPI-TXN-984210' },
      paidAt: { type: Date, default: Date.now }
    },
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

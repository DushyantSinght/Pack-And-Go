import mongoose from 'mongoose';

const luggagePassportSchema = new mongoose.Schema(
  {
    boxId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    bookingId: {
      type: String,
      default: 'PKG-MOV-CURRENT',
      index: true
    },
    userEmail: {
      type: String,
      default: 'dushyant@packandgo.in',
      index: true
    },
    boxNumber: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    fragile: {
      type: Boolean,
      default: false
    },
    conditionAtOrigin: {
      type: String,
      default: 'Mint / Factory Cushioned (Pre-move Audit Certified)'
    },
    conditionAtDropoff: {
      type: String,
      default: 'Pending Delivery Audit'
    },
    boxSize: {
      type: String,
      default: 'Medium Sturdy (18" x 14" x 12")'
    },
    sealStatus: {
      type: String,
      default: 'Tamper-Evident RFID Tape Intact'
    },
    preMovePhotoUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80'
    },
    postMovePhotoUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80'
    },
    itemsContained: {
      type: [String],
      default: []
    },
    depositProtectionNote: {
      type: String,
      default: 'Photographed & logged to prevent landlord/mover dispute.'
    },
    qrDataString: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['sealed', 'in_transit', 'inspected', 'delivered', 'disputed'],
      default: 'sealed'
    },
    verifiedCheckpoints: [
      {
        checkpointName: String,
        timestamp: { type: Date, default: Date.now },
        otpVerified: Boolean,
        captainName: String
      }
    ]
  },
  {
    timestamps: true
  }
);

export const LuggagePassport = mongoose.model('LuggagePassport', luggagePassportSchema);

import mongoose from 'mongoose';

const campusHubSchema = new mongoose.Schema(
  {
    hubId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    activeStudentsJoining: {
      type: Number,
      default: 0
    },
    discountTier: {
      type: Number,
      default: 40
    },
    nextTierTarget: {
      type: Number,
      default: 50
    },
    pooledFleetCount: {
      type: Number,
      default: 4
    },
    pickupHubLocation: {
      type: String,
      required: true
    },
    dates: {
      type: String,
      required: true
    },
    members: [
      {
        name: String,
        email: String,
        phone: String,
        college: String,
        joinedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

export const CampusHub = mongoose.model('CampusHub', campusHubSchema);

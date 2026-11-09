// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import mongoose from 'mongoose';

const loadSchema = new mongoose.Schema(
  {
    user: String,
    cuFt: Number,
    percentage: Number,
    color: String,
    from: String,
    to: String
  },
  { _id: false }
);

const stopSchema = new mongoose.Schema(
  {
    id: Number,
    type: { type: String, enum: ['pickup', 'dropoff'], default: 'pickup' },
    location: String,
    time: String,
    status: { type: String, default: 'Scheduled' },
    otpVerified: { type: Boolean, default: false }
  },
  { _id: false }
);

const pooledCorridorSchema = new mongoose.Schema(
  {
    corridorId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    city: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    vehicle: {
      type: String,
      default: 'Tata Ace 14ft EV Cargo'
    },
    driver: {
      name: { type: String, default: 'Manjunath Gowda' },
      rating: { type: Number, default: 4.9 },
      phone: { type: String, default: '+91 98452 11029' },
      email: { type: String, lowercase: true, trim: true },
      tripsCompleted: { type: Number, default: 1420 },
      photo: { type: String, default: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' }
    },
    totalCapacityCuFt: {
      type: Number,
      default: 350
    },
    currentLoads: [loadSchema],
    remainingCapacityCuFt: {
      type: Number,
      default: 30
    },
    discountRate: {
      type: Number,
      default: 45
    },
    estimatedDeparture: {
      type: String,
      default: 'Today, 02:30 PM'
    },
    liveStatus: {
      type: String,
      default: 'En-route to Dropoff #1 (Geofence Verified)'
    },
    currentSpeedKmH: {
      type: Number,
      default: 34
    },
    temperatureCelsius: {
      type: Number,
      default: 24
    },
    shockAlertCount: {
      type: Number,
      default: 0
    },
    stops: [stopSchema]
  },
  {
    timestamps: true
  }
);

export const PooledCorridor = mongoose.model('PooledCorridor', pooledCorridorSchema);

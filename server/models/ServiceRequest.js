import mongoose from 'mongoose';

// Requests that need a human on the Pack&Go ops team to follow up:
// PG visits, cook/cleaning bookings, storage, themed room setup.
const serviceRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    type: { type: String, enum: ['visit', 'service', 'storage', 'room_setup'], required: true },
    title: { type: String, required: true, maxlength: 200 },
    details: { type: mongoose.Schema.Types.Mixed },
    preferredDate: Date,
    userEmail: { type: String, required: true, index: true },
    userName: String,
    userPhone: String,
    bookingId: String,
    status: { type: String, enum: ['requested', 'confirmed', 'completed', 'cancelled'], default: 'requested', index: true },
    staffNote: String
  },
  { timestamps: true }
);

export const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

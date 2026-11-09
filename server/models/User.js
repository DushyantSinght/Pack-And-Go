import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      required: false, // optional — email-only auth
      trim: true,
      index: true,
      sparse: true     // allows multiple null values in a unique-like index
    },
    password: {
      type: String,
      default: null,
      select: false // Never returned in queries unless explicitly requested
    },
    userType: {
      type: String,
      enum: ['student', 'professional', 'captain', 'parent', 'outgoing', 'customer'],
      default: 'student',
      index: true
    },
    college: { type: String, trim: true },
    company: { type: String, trim: true },
    society: { type: String, trim: true },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    },
    escrowWalletBalance: { type: Number, default: 0 },
    tripsCompleted: { type: Number, default: 0 },
    rating: { type: Number, default: 4.9 },
    // Platform staff who can review Move Captain applications.
    isAdmin: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    ratingCount: { type: Number, default: 0 },
    acceptedTermsAt: Date,
    // Move Captains must be approved before they can take jobs or verify OTPs.
    captain: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected', 'suspended'],
        default: 'none',
        index: true
      },
      licenseNumber: { type: String, trim: true, uppercase: true },
      vehicleNumber: { type: String, trim: true, uppercase: true },
      vehicleType: { type: String, trim: true },
      appliedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: String, lowercase: true, trim: true },
      reviewNote: { type: String, trim: true, maxlength: 500 }
    }
  },
  { timestamps: true }
);

// NOTE: Password hashing is performed explicitly in routes (bcrypt, salt 12).
// The pre-save hook has been removed to give routes full, transparent control.

// Instance method to compare a plaintext candidate against the stored hash.
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);

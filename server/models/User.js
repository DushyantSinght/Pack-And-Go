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
      required: [true, 'Phone number is required'],
      trim: true,
      index: true
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
    rating: { type: Number, default: 4.9 }
  },
  { timestamps: true }
);

// Hash password before saving (only if modified)
// Note: Routes hash the password manually before create/update,
// so this hook only fires when password is set directly on a model instance.
userSchema.pre('save', async function () {
  // Only re-hash if it's a plaintext (not yet bcrypt-hashed) value
  if (!this.isModified('password') || !this.password) return;
  if (this.password.startsWith('$2')) return; // Already a bcrypt hash
  this.password = await bcrypt.hash(this.password, 10);
});

// Instance method to compare passwords
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);

import mongoose from 'mongoose';

const marketplaceItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true
    },
    society: {
      type: String,
      required: [true, 'Apartment / Society / Campus is required'],
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    seller: {
      name: { type: String, default: 'Outgoing Tenant' },
      phone: { type: String, default: '+91 98765 43210' },
      email: { type: String, default: 'seller@packandgo.in' },
      userType: { type: String, default: 'outgoing' }
    },
    price: {
      type: Number,
      required: true
    },
    originalPrice: {
      type: Number,
      default: 0
    },
    condition: {
      type: String,
      default: 'Very Good'
    },
    handoffType: {
      type: String,
      default: 'Direct In-Building P2P'
    },
    zeroTransitFee: {
      type: Boolean,
      default: true
    },
    co2SavedKg: {
      type: Number,
      default: 25
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1580481077194-46327b876404?auto=format&fit=crop&w=600&q=80'
    },
    description: {
      type: String,
      default: 'Zero-transit handoff between outgoing and incoming resident.'
    },
    status: {
      type: String,
      enum: ['available', 'claimed', 'sold'],
      default: 'available',
      index: true
    },
    claimedBy: {
      name: String,
      phone: String,
      email: String,
      claimedAt: Date
    }
  },
  {
    timestamps: true
  }
);

export const MarketplaceItem = mongoose.model('MarketplaceItem', marketplaceItemSchema);

// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    // Sorted participant ids joined with ":" + context — makes "find or create" race-free.
    key: { type: String, required: true, unique: true },
    context: {
      type: { type: String, enum: ['driver', 'seller', 'direct', 'booking'], default: 'direct' },
      refId: String,
      title: String
    },
    lastMessage: {
      text: String,
      kind: { type: String, default: 'text' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: Date
    },
    unread: { type: Map, of: Number, default: {} }
  },
  { timestamps: true }
);

export const Conversation = mongoose.model('Conversation', conversationSchema);

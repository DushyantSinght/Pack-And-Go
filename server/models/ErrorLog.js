import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['client', 'server'], required: true },
    message: { type: String, maxlength: 2000 },
    stack: { type: String, maxlength: 8000 },
    url: String,
    userAgent: String,
    userId: String,
    meta: mongoose.Schema.Types.Mixed
  },
  { timestamps: true, capped: { size: 10 * 1024 * 1024, max: 5000 } }
);

export const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);

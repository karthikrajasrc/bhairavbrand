import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, {
  versionKey: false,
});

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

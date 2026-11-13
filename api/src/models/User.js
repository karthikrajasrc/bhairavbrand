import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
    required: true,
  },
  passwordHash: {
    type: String,
    select: false,
  },
  googleSub: {
    type: String,
    unique: true,
    sparse: true,
    select: false,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);

import mongoose from 'mongoose';
import { INDIAN_STATES } from '../indianStates.js';

const deliveryRateSchema = new mongoose.Schema({
  state: { type: String, required: true, enum: INDIAN_STATES },
  deliveryCharge: { type: Number, required: true, min: 0, max: 100000 },
  enabled: { type: Boolean, required: true, default: false },
}, { _id: false });

const storeSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'delivery' },
  deliveryRates: { type: [deliveryRateSchema], default: [] },
  offersIconUrl: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2048,
    validate: {
      validator: (value) => !value || /^https:\/\/res\.cloudinary\.com\//.test(value),
      message: 'Shortcut icons must be stored in Cloudinary',
    },
  },
  shopAllIconUrl: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2048,
    validate: {
      validator: (value) => !value || /^https:\/\/res\.cloudinary\.com\//.test(value),
      message: 'Shortcut icons must be stored in Cloudinary',
    },
  },
}, { timestamps: true, versionKey: false });

export const StoreSettings = mongoose.models.StoreSettings || mongoose.model('StoreSettings', storeSettingsSchema);

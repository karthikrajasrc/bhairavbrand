import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'delivery' },
  deliveryCharge: { type: Number, required: true, min: 0, default: 0 },
  freeShippingThreshold: { type: Number, required: true, min: 0, default: 999 },
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

import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  shortDescription: { type: String, default: '', trim: true, maxlength: 320 },
  highlights: { type: [{ type: String, trim: true, maxlength: 100 }], default: [] },
  description: { type: String, default: '', trim: true, maxlength: 5000 },
  benefits: { type: [{ type: String, trim: true, maxlength: 240 }], default: [] },
  nutritionInfo: { type: String, default: '', trim: true, maxlength: 3000 },
  howToUse: { type: String, default: '', trim: true, maxlength: 2000 },
  storageInstructions: { type: String, default: '', trim: true, maxlength: 1200 },
  price: { type: Number, required: true, min: 0 },
  mrp: { type: Number, required: true, min: 0 },
  variants: {
    type: [{
      amount: { type: Number, required: true, min: Number.MIN_VALUE },
      unit: { type: String, required: true, enum: ['g', 'kg', 'ml', 'l', 'cm', 'mtr'] },
      price: { type: Number, required: true, min: 0 },
      mrp: { type: Number, required: true, min: 0 },
    }],
    default: [],
    validate: {
      validator(variants) {
        const sizes = variants.map(({ amount, unit }) => `${amount}:${unit}`);
        return new Set(sizes).size === sizes.length;
      },
      message: 'Each product size must be unique',
    },
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2048,
    match: /^https:\/\/res\.cloudinary\.com\//,
  },
  images: {
    type: [{
      type: String,
      trim: true,
      maxlength: 2048,
      match: /^https:\/\/res\.cloudinary\.com\//,
    }],
    default: [],
    validate: {
      validator(images) {
        return images.length <= 3 && (!images.length || images[0] === this.imageUrl);
      },
      message: 'Product images must contain the main image first and no more than three images',
    },
  },
}, { timestamps: true, versionKey: false });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

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

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  imageUrl: {
    type: String,
    required() {
      return !this.parentId;
    },
    trim: true,
    maxlength: 2048,
    validate: {
      validator: (value) => !value || /^https:\/\/res\.cloudinary\.com\//.test(value),
      message: 'Category images must be stored in Cloudinary',
    },
  },
  iconUrl: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2048,
    validate: {
      validator: (value) => !value || /^https:\/\/res\.cloudinary\.com\//.test(value),
      message: 'Category icons must be stored in Cloudinary',
    },
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true,
  },
}, { timestamps: true, versionKey: false });
categorySchema.index({ slug: 1 }, { unique: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  subcategory: { type: String, default: '', trim: true, lowercase: true, maxlength: 80 },
  showOnHome: { type: Boolean, default: false },
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
      unit: { type: String, required: true, enum: ['g', 'kg', 'ml', 'l'] },
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

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  imageUrl: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2048,
    match: /^https:\/\/res\.cloudinary\.com\//,
  },
}, { timestamps: true, versionKey: false });

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const StoreSettings = mongoose.models.StoreSettings || mongoose.model('StoreSettings', storeSettingsSchema);
export const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
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
}, { timestamps: true, versionKey: false });
categorySchema.index({ slug: 1 }, { unique: true });

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

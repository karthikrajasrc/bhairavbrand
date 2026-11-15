import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  stars: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, required: true, trim: true, maxlength: 1200 },
}, { timestamps: true, versionKey: false });

reviewSchema.index({ createdAt: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

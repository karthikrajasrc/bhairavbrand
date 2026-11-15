import mongoose from 'mongoose';

const contactInquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, default: '', trim: true, maxlength: 18 },
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
}, { timestamps: true, versionKey: false });

contactInquirySchema.index({ createdAt: -1 });

export const ContactInquiry = mongoose.models.ContactInquiry
  || mongoose.model('ContactInquiry', contactInquirySchema);

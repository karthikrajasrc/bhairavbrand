import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
  customer: {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 18 },
    address: {
      line1: { type: String, required: true, trim: true, maxlength: 160 },
      line2: { type: String, default: '', trim: true, maxlength: 160 },
      city: { type: String, required: true, trim: true, maxlength: 80 },
      state: { type: String, required: true, trim: true, maxlength: 80 },
      postalCode: { type: String, required: true, trim: true, maxlength: 10 },
    },
  },
  items: {
    type: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: { type: String, required: true, trim: true, maxlength: 120 },
      imageUrl: { type: String, required: true, trim: true, maxlength: 2048 },
      variantId: { type: String, required: true, trim: true, maxlength: 100 },
      variantLabel: { type: String, default: '', trim: true, maxlength: 40 },
      quantity: { type: Number, required: true, min: 1 },
      unitPricePaise: { type: Number, required: true, min: 0 },
      lineTotalPaise: { type: Number, required: true, min: 0 },
    }],
    required: true,
    validate: {
      validator: (items) => items.length > 0 && items.length <= 50,
      message: 'Orders must contain between 1 and 50 items',
    },
  },
  subtotalPaise: { type: Number, required: true, min: 0 },
  deliveryChargePaise: { type: Number, required: true, min: 0 },
  totalPaise: { type: Number, required: true, min: 100 },
  currency: { type: String, required: true, enum: ['INR'], default: 'INR' },
  razorpayOrderId: { type: String, required: true, unique: true, trim: true },
  razorpayPaymentId: { type: String, default: '', trim: true },
  paymentStatus: { type: String, required: true, enum: ['pending', 'paid'], default: 'pending' },
  status: {
    type: String,
    required: true,
    enum: ['pending_payment', 'new', 'accepted', 'dispatched'],
    default: 'pending_payment',
  },
  trackingId: { type: String, default: '', trim: true, maxlength: 120 },
  trackingUrl: { type: String, default: '', trim: true, maxlength: 2048 },
  paidAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

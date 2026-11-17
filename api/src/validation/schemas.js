import { z } from 'zod';
import { INDIAN_STATES } from '../indianStates.js';

const passwordSchema = z.string()
  .min(12)
  .max(128)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');

const cloudinaryImageUrlSchema = z.string().trim().min(1).max(2048).url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}, 'Image must be uploaded to Cloudinary');

const slugSchema = z.string().trim().toLowerCase().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: passwordSchema,
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password is too long'),
}).strict();

export const googleSchema = z.object({ credential: z.string().min(20).max(8192) }).strict();

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  iconUrl: z.string().trim().max(2048).default('').refine((value) => (
    !value || cloudinaryImageUrlSchema.safeParse(value).success
  ), 'Icon must be uploaded to Cloudinary'),
}).strict();

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: slugSchema,
  shortDescription: z.string().trim().max(320).default(''),
  highlights: z.array(z.string().trim().min(2).max(100)).max(8).default([]),
  description: z.string().trim().max(5000).default(''),
  benefits: z.array(z.string().trim().min(2).max(240)).max(12).default([]),
  nutritionInfo: z.string().trim().max(3000).default(''),
  howToUse: z.string().trim().max(2000).default(''),
  storageInstructions: z.string().trim().max(1200).default(''),
  price: z.number().finite().min(0).max(10000000),
  mrp: z.number().finite().min(0).max(10000000),
  variants: z.array(z.object({
    amount: z.number().finite().positive().max(100000),
    unit: z.enum(['g', 'kg', 'ml', 'l', 'cm', 'mtr']),
    price: z.number().finite().min(0).max(10000000),
    mrp: z.number().finite().min(0).max(10000000),
  }).strict().refine((variant) => variant.mrp >= variant.price, {
    message: 'MRP must be equal to or greater than the selling price',
    path: ['mrp'],
  })).min(1).max(20).optional(),
  imageUrl: cloudinaryImageUrlSchema,
  images: z.array(cloudinaryImageUrlSchema).min(1).max(3).optional(),
}).strict().refine((product) => product.mrp >= product.price, {
  message: 'MRP must be equal to or greater than the selling price',
  path: ['mrp'],
}).refine((product) => {
  if (!product.variants) return true;
  const sizes = product.variants.map(({ amount, unit }) => `${amount}:${unit}`);
  return new Set(sizes).size === sizes.length;
}, {
  message: 'Each product size must be unique',
  path: ['variants'],
}).refine((product) => !product.images || product.images[0] === product.imageUrl, {
  message: 'The first product image must be the main image',
  path: ['images'],
});

const deliveryRateSchema = z.object({
  state: z.enum(INDIAN_STATES),
  deliveryCharge: z.number().finite().min(0).max(100000),
  enabled: z.boolean(),
}).strict();

export const deliverySchema = z.object({
  deliveryRates: z.array(deliveryRateSchema).length(INDIAN_STATES.length)
    .refine((rates) => new Set(rates.map(({ state }) => state)).size === INDIAN_STATES.length, {
      message: 'Configure each state or union territory exactly once',
    }),
}).strict();

const trackingUrlSchema = z.string().trim().max(2048).url().refine((value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, 'Tracking URL must use HTTPS');

export const orderStatusUpdateSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('accepted'),
  }).strict(),
  z.object({
    status: z.literal('dispatched'),
    trackingId: z.string().trim().min(1).max(120),
    trackingUrl: trackingUrlSchema,
  }).strict(),
]);

export const categoryShortcutIconsSchema = z.object({
  offersIconUrl: z.string().trim().max(2048).default('').refine((value) => (
    !value || cloudinaryImageUrlSchema.safeParse(value).success
  ), 'Image must be uploaded to Cloudinary'),
  shopAllIconUrl: z.string().trim().max(2048).default('').refine((value) => (
    !value || cloudinaryImageUrlSchema.safeParse(value).success
  ), 'Image must be uploaded to Cloudinary'),
}).strict();

export const reviewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  stars: z.number().int().min(1).max(5),
  comments: z.string().trim().min(3).max(1200),
}).strict();

export const objectIdSchema = z.string().regex(/^[\da-f]{24}$/i);

const checkoutItemsSchema = z.array(z.object({
  productId: objectIdSchema,
  variantId: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(99),
}).strict()).min(1).max(50).refine((items) => {
  const keys = items.map(({ productId, variantId }) => `${productId}:${variantId}`);
  return new Set(keys).size === keys.length;
}, { message: 'Each product size can appear only once' });

const checkoutPhoneSchema = z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number');

const deliveryStateSchema = z.enum(INDIAN_STATES);

export const checkoutQuoteSchema = z.object({
  items: checkoutItemsSchema,
  state: deliveryStateSchema,
}).strict();

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    phone: checkoutPhoneSchema,
    address: z.object({
      line1: z.string().trim().min(5).max(160),
      line2: z.string().trim().max(160).default(''),
      city: z.string().trim().min(2).max(80),
      state: deliveryStateSchema,
      postalCode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
    }).strict(),
  }).strict(),
  items: checkoutItemsSchema,
}).strict();

const checkoutOrderItemSchema = z.object({
  productId: objectIdSchema,
  name: z.string().trim().min(1).max(120),
  imageUrl: z.string().trim().min(1).max(2048).url(),
  variantId: z.string().trim().min(1).max(100),
  variantLabel: z.string().trim().max(40).default(''),
  quantity: z.number().int().min(1).max(99),
  unitPricePaise: z.number().int().nonnegative(),
  lineTotalPaise: z.number().int().nonnegative(),
}).strict();

export const checkoutOrderSnapshotSchema = z.object({
  orderNumber: z.string().regex(/^BB-[A-F0-9]{16}$/),
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  customer: checkoutSchema.shape.customer,
  items: z.array(checkoutOrderItemSchema).min(1).max(50),
  subtotalPaise: z.number().int().nonnegative(),
  deliveryChargePaise: z.number().int().nonnegative(),
  totalPaise: z.number().int().nonnegative(),
  currency: z.literal('INR'),
}).strict().refine((snapshot) => {
  const subtotalPaise = snapshot.items.reduce((total, item) => total + item.lineTotalPaise, 0);
  return subtotalPaise === snapshot.subtotalPaise
    && subtotalPaise + snapshot.deliveryChargePaise === snapshot.totalPaise;
}, 'Checkout totals are invalid');

export const paymentVerificationSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-fA-F0-9]{64}$/),
  checkoutToken: z.string().min(1).max(200000).optional(),
}).strict();

export const contactInquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(18).default('').refine((value) => {
    if (!value) return true;
    const digits = value.replace(/\D/g, '');
    return /^\+?[\d ()-]+$/.test(value) && digits.length >= 10 && digits.length <= 15;
  }, 'Enter a valid phone number'),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(3000),
}).strict();

const trackOrderByNumberSchema = z.object({
  orderNumber: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(254).optional(),
  phone: checkoutPhoneSchema.optional(),
}).strict().refine(({ email, phone }) => Boolean(email) !== Boolean(phone), {
  message: 'Enter your checkout email or phone number',
  path: ['email'],
});

const trackOrdersByPhoneSchema = z.object({
  phone: checkoutPhoneSchema,
}).strict();

export const trackOrderSchema = z.union([
  trackOrderByNumberSchema,
  trackOrdersByPhoneSchema,
]);

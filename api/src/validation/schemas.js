import { z } from 'zod';

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

export const deliverySchema = z.object({
  deliveryCharge: z.number().finite().min(0).max(100000),
  freeShippingThreshold: z.number().finite().min(0).max(10000000),
}).strict();

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

export const checkoutQuoteSchema = z.object({ items: checkoutItemsSchema }).strict();

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(10).max(18).refine((value) => {
      const digits = value.replace(/\D/g, '');
      return /^\+?[\d ()-]+$/.test(value) && digits.length >= 10 && digits.length <= 15;
    }, 'Enter a valid phone number'),
    address: z.object({
      line1: z.string().trim().min(5).max(160),
      line2: z.string().trim().max(160).default(''),
      city: z.string().trim().min(2).max(80),
      state: z.string().trim().min(2).max(80),
      postalCode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
    }).strict(),
  }).strict(),
  items: checkoutItemsSchema,
}).strict();

export const paymentVerificationSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-fA-F0-9]{64}$/),
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

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(254),
}).strict();

import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import helmet from 'helmet';
import multer from 'multer';
import { z } from 'zod';
import { InvalidImageError, prepareImage } from './imageProcessing.js';

const SESSION_COOKIE = 'bb_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
const passwordSchema = z.string()
  .min(12)
  .max(128)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: passwordSchema,
}).strict();
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password is too long'),
}).strict();
const googleSchema = z.object({ credential: z.string().min(20).max(8192) }).strict();
const cloudinaryImageUrlSchema = z.string().trim().min(1).max(2048).url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}, 'Image must be uploaded to Cloudinary');
const slugSchema = z.string().trim().toLowerCase().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  imageUrl: z.string().trim().max(2048).default('').refine((value) => (
    !value || cloudinaryImageUrlSchema.safeParse(value).success
  ), 'Image must be uploaded to Cloudinary'),
  iconUrl: z.string().trim().max(2048).default('').refine((value) => (
    !value || cloudinaryImageUrlSchema.safeParse(value).success
  ), 'Icon must be uploaded to Cloudinary'),
  parentId: z.string().regex(/^[\da-f]{24}$/i).nullable().default(null),
}).strict().refine((category) => Boolean(category.parentId) || Boolean(category.imageUrl), {
  message: 'Top-level categories require an image',
  path: ['imageUrl'],
});
const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: slugSchema,
  subcategory: z.union([z.literal(''), slugSchema]).default(''),
  showOnHome: z.boolean().default(false),
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
    unit: z.enum(['g', 'kg', 'ml', 'l']),
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
const deliverySchema = z.object({
  deliveryCharge: z.number().finite().min(0).max(100000),
  freeShippingThreshold: z.number().finite().min(0).max(10000000),
}).strict();
const categoryShortcutIconsSchema = z.object({
  offersIconUrl: z.string().trim().max(2048).default('').refine((value) => (
    !value || cloudinaryImageUrlSchema.safeParse(value).success
  ), 'Image must be uploaded to Cloudinary'),
  shopAllIconUrl: z.string().trim().max(2048).default('').refine((value) => (
    !value || cloudinaryImageUrlSchema.safeParse(value).success
  ), 'Image must be uploaded to Cloudinary'),
}).strict();
const bannerSchema = z.object({
  title: z.string().trim().min(2).max(120),
  imageUrl: cloudinaryImageUrlSchema,
}).strict();
const objectIdSchema = z.string().regex(/^[\da-f]{24}$/i);

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const publicUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name,
  role: user.role || 'customer',
  createdAt: user.createdAt,
});
const isDuplicateKeyError = (error) => error?.code === 11000;

export function createApp({
  User,
  Session,
  Product,
  Category,
  StoreSettings,
  Banner,
  uploadImage,
  uiOrigin,
  googleClientId = '',
  adminEmail = 'admin@bb.com',
  verifyGoogleCredential,
  nodeEnv = 'development',
  trustProxyHops = 0,
}) {
  const app = express();
  const googleClient = new OAuth2Client(googleClientId || undefined);
  const secureCookie = nodeEnv === 'production';

  app.disable('x-powered-by');
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === uiOrigin) return callback(null, true);
      return callback(new Error('Origin is not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }));
  app.use(express.json({ limit: '16kb', strict: true }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('origin') !== uiOrigin) {
      return res.status(403).json({ error: 'Request origin is not allowed' });
    }
    return next();
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Try again later.' },
  });
  const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter(_req, file, callback) {
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff']);
      if (!allowedTypes.has(file.mimetype)) {
        const error = new Error('Choose a JPEG, PNG, WebP, AVIF, or TIFF image');
        error.status = 400;
        callback(error);
        return;
      }
      callback(null, true);
    },
  }).single('image');

  const setSessionCookie = (res, token) => {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: secureCookie ? 'none' : 'lax',
      path: '/',
      maxAge: SESSION_DURATION,
    });
  };

  const createSession = async (user, res) => {
    const token = randomBytes(32).toString('base64url');
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + SESSION_DURATION);
    await Session.create({
      tokenHash: hashToken(token),
      user: user._id,
      createdAt,
      expiresAt,
    });
    setSessionCookie(res, token);
    return publicUser(user);
  };

  const requireUser = async (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token || token.length > 128) return res.status(401).json({ error: 'Sign in required' });
    try {
      const session = await Session.findOne({
        tokenHash: hashToken(token),
        expiresAt: { $gt: new Date() },
      }).populate('user', 'email name role createdAt');
      if (!session?.user) return res.status(401).json({ error: 'Sign in required' });
      req.user = session.user;
      req.sessionId = session._id;
      return next();
    } catch (error) {
      return next(error);
    }
  };
  const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    return next();
  };

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.post('/api/auth/register', authLimiter, async (req, res, next) => {
    try {
      const input = registerSchema.parse(req.body);
      const user = await User.create({
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: 'customer',
      });
      return res.status(201).json({ user: await createSession(user, res) });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({ error: 'An account with that email already exists' });
      }
      return next(error);
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res, next) => {
    try {
      const input = loginSchema.parse(req.body);
      const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
      const validPassword = user?.passwordHash
        ? await bcrypt.compare(input.password, user.passwordHash)
        : await bcrypt.compare(input.password, '$2a$12$C6UzMDM.H6dfI/f/IKcEe.1zYv7kMkU9i6eZsX0gH5XQcx7f/2SeK');
      if (!user || !validPassword) return res.status(401).json({ error: 'Email or password is incorrect' });
      return res.json({ user: await createSession(user, res) });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/google', authLimiter, async (req, res, next) => {
    try {
      if (!googleClientId) return res.status(503).json({ error: 'Google sign-in is not configured' });
      const { credential } = googleSchema.parse(req.body);
      let ticket;
      try {
        ticket = verifyGoogleCredential
          ? await verifyGoogleCredential(credential)
          : await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
      } catch {
        return res.status(401).json({ error: 'Google credential is invalid or expired' });
      }
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        return res.status(401).json({ error: 'Google account could not be verified' });
      }

      const email = payload.email.toLowerCase();
      const isAdminEmail = email === adminEmail.trim().toLowerCase();
      const googleName = payload.name?.trim().slice(0, 80);
      let user = await User.findOne({ googleSub: payload.sub }).select('+googleSub');

      if (!user) {
        const existingEmailUser = await User.findOne({ email }).select('+googleSub');
        if (existingEmailUser) {
          if (existingEmailUser.googleSub) {
            return res.status(409).json({ error: 'This email is already linked to another Google account' });
          }
          user = await User.findOneAndUpdate(
            { _id: existingEmailUser._id, googleSub: { $exists: false } },
            { $set: {
              googleSub: payload.sub,
              name: googleName || existingEmailUser.name,
              ...(isAdminEmail ? { role: 'admin' } : {}),
            }, ...(isAdminEmail ? { $unset: { passwordHash: 1 } } : {}) },
            { new: true, runValidators: true },
          );
          if (!user) {
            return res.status(409).json({ error: 'This email is already linked to another Google account' });
          }
        } else {
          try {
            user = await User.create({
              email,
              name: googleName || email,
              googleSub: payload.sub,
              role: isAdminEmail ? 'admin' : 'customer',
            });
          } catch (error) {
            if (!isDuplicateKeyError(error)) throw error;
            user = await User.findOne({ googleSub: payload.sub }).select('+googleSub');
            if (!user) {
              return res.status(409).json({ error: 'This Google account could not be linked to the email address' });
            }
          }
        }
      }

      if (isAdminEmail) {
        user = await User.findOneAndUpdate(
          { _id: user._id },
          { $set: { role: 'admin' }, $unset: { passwordHash: 1 } },
          { new: true, runValidators: true },
        );
        if (!user) return res.status(409).json({ error: 'The admin account could not be updated' });
      }

      return res.json({ user: await createSession(user, res) });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({ error: 'This Google account could not be linked to the email address' });
      }
      return next(error);
    }
  });

  app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

  app.post('/api/auth/logout', requireUser, async (req, res, next) => {
    try {
      await Session.deleteOne({ _id: req.sessionId });
      res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: secureCookie ? 'none' : 'lax',
        path: '/',
      });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/products', async (_req, res, next) => {
    try {
      return res.json({ products: await Product.find({}).sort({ createdAt: -1 }) });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/storefront/categories', async (_req, res, next) => {
    try {
      return res.json({ categories: await Category.find({}).sort({ name: 1 }) });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/storefront/delivery-charges', async (_req, res, next) => {
    try {
      const settings = await StoreSettings.findOne({ key: 'delivery' });
      return res.json({
        deliveryCharge: settings?.deliveryCharge ?? 0,
        freeShippingThreshold: settings?.freeShippingThreshold ?? 999,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/storefront/category-shortcut-icons', async (_req, res, next) => {
    try {
      const settings = await StoreSettings.findOne({ key: 'delivery' });
      return res.json({
        offersIconUrl: settings?.offersIconUrl ?? '',
        shopAllIconUrl: settings?.shopAllIconUrl ?? '',
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/storefront/banners', async (_req, res, next) => {
    try {
      return res.json({ banners: await Banner.find({}).sort({ createdAt: -1 }) });
    } catch (error) {
      return next(error);
    }
  });

  app.use('/api/admin', requireUser, requireAdmin);

  app.get('/api/admin/categories', async (_req, res, next) => {
    try {
      return res.json({ categories: await Category.find({}).sort({ name: 1 }) });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/admin/categories', async (req, res, next) => {
    try {
      const input = categorySchema.parse(req.body);
      if (await Category.findOne({ slug: input.slug })) {
        return res.status(409).json({ error: 'A category with this URL already exists' });
      }
      if (input.parentId) {
        const parent = await Category.findById(input.parentId);
        if (!parent || parent.parentId) {
          return res.status(400).json({ error: 'Choose a top-level category as the parent' });
        }
      }
      return res.status(201).json({ category: await Category.create(input) });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/admin/categories/:id', async (req, res, next) => {
    try {
      const id = objectIdSchema.parse(req.params.id);
      const input = categorySchema.parse(req.body);
      const category = await Category.findById(id);
      if (!category) return res.status(404).json({ error: 'Category not found' });
      if (Boolean(category.parentId) !== Boolean(input.parentId)) {
        return res.status(400).json({ error: 'A category cannot change between top-level and subcategory' });
      }
      if (input.parentId) {
        if (input.parentId === id) return res.status(400).json({ error: 'A category cannot be its own parent' });
        const parent = await Category.findById(input.parentId);
        if (!parent || parent.parentId) {
          return res.status(400).json({ error: 'Choose a top-level category as the parent' });
        }
      }
      const duplicate = await Category.findOne({ slug: input.slug });
      if (duplicate && duplicate._id.toString() !== id) {
        return res.status(409).json({ error: 'A category with this URL already exists' });
      }

      const previousSlug = category.slug;
      const previousParentId = category.parentId?.toString() || '';
      const nextParentId = input.parentId || '';
      const nextParent = nextParentId ? await Category.findById(nextParentId) : null;
      const productChanges = {};
      if (category.parentId) {
        if (previousSlug !== input.slug) productChanges.subcategory = input.slug;
        if (previousParentId !== nextParentId) productChanges.category = nextParent.slug;
      } else if (previousSlug !== input.slug) {
        productChanges.category = input.slug;
      }
      if (Object.keys(productChanges).length) {
        const productFilter = category.parentId
          ? { subcategory: previousSlug }
          : { category: previousSlug };
        await Product.updateMany(productFilter, { $set: productChanges });
      }
      const updatedCategory = await Category.findByIdAndUpdate(id, input, { new: true, runValidators: true });
      return res.json({ category: updatedCategory });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/admin/categories/:id', async (req, res, next) => {
    try {
      const id = objectIdSchema.parse(req.params.id);
      const category = await Category.findById(id);
      if (!category) return res.status(404).json({ error: 'Category not found' });
      if (await Category.findOne({ parentId: id })) {
        return res.status(409).json({ error: 'Remove this category’s subcategories first' });
      }
      const productFilter = category.parentId
        ? { subcategory: category.slug }
        : { category: category.slug };
      if (await Product.findOne(productFilter)) {
        return res.status(409).json({ error: 'Move or remove this category’s products first' });
      }
      await Category.findByIdAndDelete(id);
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/admin/images', (req, res, next) => {
    if (!uploadImage) {
      return res.status(503).json({ error: 'Cloudinary image uploads are not configured' });
    }
    return imageUpload(req, res, (error) => error ? next(error) : next());
  }, async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Choose an image to upload' });
      const { buffer, format } = await prepareImage(req.file.buffer);
      const imageUrl = await uploadImage({ buffer, format });
      if (typeof imageUrl !== 'string' || !imageUrl.startsWith('https://res.cloudinary.com/')) {
        throw new Error('Image storage returned an invalid Cloudinary URL');
      }
      return res.status(201).json({ imageUrl, format });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/products', async (_req, res, next) => {
    try {
      return res.json({ products: await Product.find({}).sort({ createdAt: -1 }) });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/products/:id', async (req, res, next) => {
    try {
      const id = objectIdSchema.parse(req.params.id);
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json({ product });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/admin/products', async (req, res, next) => {
    try {
      const input = productSchema.parse(req.body);
      input.images = input.images?.length ? input.images : [input.imageUrl];
      if (input.variants?.length) {
        input.price = input.variants[0].price;
        input.mrp = input.variants[0].mrp;
      }
      const category = await Category.findOne({ slug: input.category, parentId: null });
      if (!category) return res.status(400).json({ error: 'Choose an existing top-level category' });
      if (input.subcategory) {
        const subcategory = await Category.findOne({ slug: input.subcategory, parentId: category._id });
        if (!subcategory) return res.status(400).json({ error: 'Choose a subcategory within the selected category' });
      }
      return res.status(201).json({ product: await Product.create(input) });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/admin/products/:id', async (req, res, next) => {
    try {
      const id = objectIdSchema.parse(req.params.id);
      const input = productSchema.parse(req.body);
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      input.images = input.images?.length ? input.images : [input.imageUrl];
      if (input.variants?.length) {
        input.price = input.variants[0].price;
        input.mrp = input.variants[0].mrp;
      }
      const category = await Category.findOne({ slug: input.category, parentId: null });
      if (!category) return res.status(400).json({ error: 'Choose an existing top-level category' });
      if (input.subcategory) {
        const subcategory = await Category.findOne({ slug: input.subcategory, parentId: category._id });
        if (!subcategory) return res.status(400).json({ error: 'Choose a subcategory within the selected category' });
      }
      product.set(input);
      await product.save();
      return res.json({ product });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/admin/products/:id', async (req, res, next) => {
    try {
      const id = objectIdSchema.parse(req.params.id);
      const product = await Product.findByIdAndDelete(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/delivery-charges', async (_req, res, next) => {
    try {
      const settings = await StoreSettings.findOne({ key: 'delivery' });
      return res.json({
        deliveryCharge: settings?.deliveryCharge ?? 0,
        freeShippingThreshold: settings?.freeShippingThreshold ?? 999,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/admin/delivery-charges', async (req, res, next) => {
    try {
      const input = deliverySchema.parse(req.body);
      const settings = await StoreSettings.findOneAndUpdate(
        { key: 'delivery' },
        { $set: input, $setOnInsert: { key: 'delivery' } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
      return res.json({
        deliveryCharge: settings.deliveryCharge,
        freeShippingThreshold: settings.freeShippingThreshold,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/admin/category-shortcut-icons', async (req, res, next) => {
    try {
      const input = categoryShortcutIconsSchema.parse(req.body);
      const settings = await StoreSettings.findOneAndUpdate(
        { key: 'delivery' },
        { $set: input, $setOnInsert: { key: 'delivery' } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
      return res.json({
        offersIconUrl: settings.offersIconUrl ?? '',
        shopAllIconUrl: settings.shopAllIconUrl ?? '',
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/admin/banners', async (_req, res, next) => {
    try {
      return res.json({ banners: await Banner.find({}).sort({ createdAt: -1 }) });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/admin/banners', async (req, res, next) => {
    try {
      const input = bannerSchema.parse(req.body);
      return res.status(201).json({ banner: await Banner.create(input) });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/admin/banners/:id', async (req, res, next) => {
    try {
      const id = objectIdSchema.parse(req.params.id);
      const banner = await Banner.findByIdAndDelete(id);
      if (!banner) return res.status(404).json({ error: 'Banner not found' });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 8 MB or smaller'
        : 'Upload one image at a time';
      return res.status(status).json({ error: message });
    }
    if (error instanceof InvalidImageError || error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Please check the provided information', fields: error.flatten().fieldErrors });
    }
    if (error.name === 'ValidationError' && error.errors) {
      return res.status(400).json({
        error: 'Please check the provided information',
        fields: Object.fromEntries(Object.entries(error.errors).map(([field, fieldError]) => (
          [field, fieldError.message]
        ))),
      });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }
    if (error.message === 'Origin is not allowed') {
      return res.status(403).json({ error: 'Origin is not allowed' });
    }
    console.error('API request failed:', error);
    return res.status(500).json({ error: 'An unexpected server error occurred' });
  });

  return app;
}

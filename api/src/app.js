import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { createAdminController } from './controllers/adminController.js';
import { createAuthController } from './controllers/authController.js';
import { createCheckoutController } from './controllers/checkoutController.js';
import { createContactController } from './controllers/contactController.js';
import { createStorefrontController } from './controllers/storefrontController.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createImageUploadMiddleware } from './middleware/imageUpload.js';
import { requireRequestOrigin } from './middleware/requestOrigin.js';
import { createAdminRoutes } from './routes/adminRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createCheckoutRoutes } from './routes/checkoutRoutes.js';
import { createContactRoutes } from './routes/contactRoutes.js';
import { createStorefrontRoutes } from './routes/storefrontRoutes.js';
import { createRazorpayService } from './services/razorpayService.js';

export function createApp({
  User,
  Session,
  Product,
  Category,
  StoreSettings,
  Order,
  ContactInquiry,
  Review,
  uploadImage,
  uiOrigin,
  googleClientId = '',
  adminEmail = 'admin@bb.com',
  razorpayKeyId = '',
  razorpayKeySecret = '',
  fetchImpl = globalThis.fetch,
  verifyGoogleCredential,
  nodeEnv = 'development',
  trustProxyHops = 0,
}) {
  const app = express();
  const secureCookie = nodeEnv === 'production';
  const auth = createAuthMiddleware({ Session, adminEmail, secureCookie });
  const razorpay = createRazorpayService({
    keyId: razorpayKeyId,
    keySecret: razorpayKeySecret,
    fetchImpl,
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Try again later.' },
  });
  const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many checkout attempts. Please try again later.' },
  });
  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  });

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
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use(cookieParser());
  app.use(requireRequestOrigin(uiOrigin));

  const authController = createAuthController({
    User,
    auth,
    googleClientId,
    adminEmail,
    verifyGoogleCredential,
  });
  const storefrontController = createStorefrontController({ Product, Category, StoreSettings, Review });
  const checkoutController = createCheckoutController({ Product, StoreSettings, Order, razorpay });
  const contactController = createContactController({ ContactInquiry, Order });
  const adminController = createAdminController({
    Category,
    Product,
    StoreSettings,
    Order,
    Review,
    uploadImage,
  });

  app.use('/api', createStorefrontRoutes({ controller: storefrontController }));
  app.use('/api', createContactRoutes({ controller: contactController, limiter: contactLimiter }));
  app.use('/api/auth', createAuthRoutes({
    controller: authController,
    limiter: authLimiter,
    requireUser: auth.requireUser,
  }));
  app.use('/api/checkout', createCheckoutRoutes({ controller: checkoutController, limiter: checkoutLimiter }));
  app.use(
    '/api/admin',
    auth.requireUser,
    auth.requireAdmin,
    createAdminRoutes({
      controller: adminController,
      imageUpload: createImageUploadMiddleware(),
    }),
  );
  app.use(errorHandler);

  return app;
}

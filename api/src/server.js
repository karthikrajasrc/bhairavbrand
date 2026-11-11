import 'dotenv/config';
import { createApp } from './app.js';
import { createCloudinaryImageUploader } from './cloudinary.js';
import { connectDatabase, disconnectDatabase } from './database.js';
import { Banner, Category, Product, Session, StoreSettings, User } from './models.js';

const port = Number(process.env.API_PORT || 4000);
const uiOrigin = process.env.UI_ORIGIN || 'http://localhost:5173';
const mongoUri = process.env.MONGODB_URI;
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('API_PORT must be a valid TCP port');
}
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
}
if (process.env.NODE_ENV === 'production' && !uiOrigin.startsWith('https://')) {
  throw new Error('UI_ORIGIN must use HTTPS in production');
}

if (!mongoUri) {
  throw new Error('MONGODB_URI must be configured before starting the API');
}

await connectDatabase(mongoUri);
const app = createApp({
  User,
  Session,
  Product,
  Category,
  StoreSettings,
  Banner,
  uploadImage: createCloudinaryImageUploader({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  }),
  uiOrigin,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@bb.com',
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxyHops,
});

const server = app.listen(port, () => console.log(`Banyan Basket API listening on port ${port}`));
let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

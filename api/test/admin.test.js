import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { Category, Order, Product, StoreSettings, User } from '../src/models/index.js';
import { INDIAN_STATES } from '../src/indianStates.js';
import { prepareImage } from '../src/imageProcessing.js';

const uiOrigin = 'http://localhost:5173';
const users = [];
const sessions = [];
const products = [];
const categories = [];
const orders = [];
const razorpayResponses = [];
let storeSettings = null;
let nextId = 1;
let server;
let baseUrl;
let uploadedImage;

const nextObjectId = () => String(nextId++).padStart(24, '0');
const matches = (document, filter) => Object.entries(filter).every(([key, value]) => {
  if (value && typeof value === 'object' && '$exists' in value) {
    return value.$exists ? key in document : !(key in document);
  }
  if (value && typeof value === 'object' && '$gt' in value) return document[key] > value.$gt;
  if (value && typeof value === 'object' && '$in' in value) {
    return value.$in.includes(document[key]?.toString());
  }
  return document[key] === value;
});
const query = (operation) => {
  const result = Promise.resolve().then(operation);
  result.select = () => result;
  result.populate = () => result;
  result.sort = () => result;
  result.lean = () => result;
  return result;
};

const FakeUser = {
  create: async (input) => {
    const user = { ...input, _id: nextObjectId(), createdAt: new Date() };
    users.push(user);
    return user;
  },
  findOne: (filter) => query(() => users.find((user) => matches(user, filter)) || null),
  findOneAndUpdate: async (filter, update) => {
    const user = users.find((item) => matches(item, filter));
    if (!user) return null;
    Object.assign(user, update.$set);
    for (const key of Object.keys(update.$unset || {})) delete user[key];
    return user;
  },
};

const FakeSession = {
  create: async (input) => {
    const session = { ...input, _id: nextObjectId() };
    sessions.push(session);
    return session;
  },
  findOne: (filter) => query(() => {
    const session = sessions.find((item) => matches(item, filter));
    if (!session) return null;
    const user = users.find((item) => item._id === session.user);
    return user ? { ...session, user } : null;
  }),
  deleteOne: async (filter) => {
    const index = sessions.findIndex((item) => matches(item, filter));
    if (index >= 0) sessions.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  },
};

const FakeProduct = {
  create: async (input) => {
    const product = {
      ...input,
      variants: (input.variants || []).map((variant) => ({ ...variant, _id: nextObjectId() })),
      _id: nextObjectId(),
      set(values) {
        Object.assign(this, values);
        if (values.variants) {
          this.variants = values.variants.map((variant) => ({ ...variant, _id: nextObjectId() }));
        }
      },
      async save() { return this; },
    };
    products.push(product);
    return product;
  },
  find: (filter) => query(() => products.filter((item) => matches(item, filter))),
  findOne: (filter) => query(() => products.find((item) => matches(item, filter)) || null),
  findById: (id) => query(() => products.find((item) => item._id === id) || null),
  findByIdAndUpdate: async (id, input) => {
    const product = products.find((item) => item._id === id);
    if (!product) return null;
    Object.assign(product, input);
    return product;
  },
  updateMany: async (filter, update) => {
    const matched = products.filter((item) => matches(item, filter));
    for (const product of matched) Object.assign(product, update.$set);
    return { modifiedCount: matched.length };
  },
  findByIdAndDelete: async (id) => {
    const index = products.findIndex((item) => item._id === id);
    return index < 0 ? null : products.splice(index, 1)[0];
  },
};

const FakeCategory = {
  create: async (input) => {
    const category = { ...input, _id: nextObjectId() };
    categories.push(category);
    return category;
  },
  find: (filter) => query(() => categories.filter((item) => matches(item, filter))),
  findOne: (filter) => query(() => categories.find((item) => matches(item, filter)) || null),
  findById: (id) => query(() => categories.find((item) => item._id === id) || null),
  findByIdAndUpdate: async (id, input) => {
    const category = categories.find((item) => item._id === id);
    if (!category) return null;
    Object.assign(category, input);
    return category;
  },
  findByIdAndDelete: async (id) => {
    const index = categories.findIndex((item) => item._id === id);
    return index < 0 ? null : categories.splice(index, 1)[0];
  },
};

const FakeStoreSettings = {
  findOne: (filter) => query(() => storeSettings?.key === filter.key ? storeSettings : null),
  findOneAndUpdate: async (_filter, update) => {
    storeSettings = { ...(storeSettings || { key: 'delivery' }), ...update.$set };
    for (const key of Object.keys(update.$unset || {})) delete storeSettings[key];
    return storeSettings;
  },
};

const FakeOrder = {
  create: async (input) => {
    const order = {
      ...input,
      _id: nextObjectId(),
      createdAt: new Date(),
      async save() { return this; },
    };
    orders.push(order);
    return order;
  },
  find: (filter) => query(() => orders.filter((item) => matches(item, filter))),
  findOne: (filter) => query(() => orders.find((item) => matches(item, filter)) || null),
  findById: (id) => query(() => orders.find((item) => item._id === id) || null),
  findOneAndUpdate: async (filter, update) => {
    const order = orders.find((item) => matches(item, filter));
    if (!order) return null;
    Object.assign(order, update.$set);
    return order;
  },
};

before(async () => {
  const app = createApp({
    User: FakeUser,
    Session: FakeSession,
    Product: FakeProduct,
    Category: FakeCategory,
    StoreSettings: FakeStoreSettings,
    Order: FakeOrder,
    razorpayKeyId: 'rzp_test_id',
    razorpayKeySecret: 'test_razorpay_secret',
    fetchImpl: async () => {
      const responseBody = razorpayResponses.shift();
      if (!responseBody) throw new Error('No mocked Razorpay response is queued');
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    uiOrigin,
    uploadImage: async ({ buffer, format }) => {
      uploadedImage = { buffer, format };
      return 'https://res.cloudinary.com/test/image/upload/sample.webp';
    },
    googleClientId: 'test-client-id',
    verifyGoogleCredential: async () => ({
      getPayload: () => ({
        sub: 'google-admin-sub',
        email: 'admin@bb.com',
        email_verified: true,
        name: 'Basket Admin',
      }),
    }),
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('admin role model and persisted store models have expected constraints', () => {
  assert.equal(User.schema.path('role').options.default, 'customer');
  assert.deepEqual(User.schema.path('role').options.enum, ['customer', 'admin']);
  assert.equal(Product.schema.path('name').options.required, true);
  assert.equal(Category.schema.path('slug').options.required, true);
  assert.equal(Category.schema.path('imageUrl'), undefined);
  assert.equal(Category.schema.path('parentId'), undefined);
  assert.equal(Product.schema.path('subcategory'), undefined);
  assert.equal(new Category({ name: 'Pantry', slug: 'pantry' }).validateSync(), undefined);
  assert.equal(new Category({ name: 'Pantry', slug: 'pantry' }).iconUrl, '');
  assert.equal(Product.schema.path('imageUrl').options.required, true);
  assert.equal(Order.schema.path('razorpayOrderId').options.required, true);
  assert.deepEqual(Order.schema.path('status').options.enum, ['pending_payment', 'new', 'accepted', 'dispatched']);
  assert.equal(Product.schema.path('showOnHome'), undefined);
  assert.equal(Product.schema.path('description').options.default, '');
  assert.deepEqual(new Product().benefits, []);
  const mainImage = 'https://res.cloudinary.com/test/image/upload/main.webp';
  const galleryProduct = new Product({
    name: 'Gallery product',
    category: 'pantry',
    price: 10,
    mrp: 10,
    imageUrl: mainImage,
    images: [mainImage, 'https://res.cloudinary.com/test/image/upload/side.webp'],
  });
  assert.equal(galleryProduct.validateSync(), undefined);
  galleryProduct.set({
    name: 'Updated gallery product',
    price: 8,
    mrp: 12,
    images: [mainImage, 'https://res.cloudinary.com/test/image/upload/side.webp'],
  });
  assert.equal(galleryProduct.validateSync(), undefined);
  const invalidGallery = new Product({
    name: 'Invalid gallery',
    category: 'pantry',
    price: 10,
    mrp: 10,
    imageUrl: mainImage,
    images: ['https://res.cloudinary.com/test/image/upload/side.webp', mainImage],
  });
  assert.equal(invalidGallery.validateSync().errors.images.path, 'images');
  assert.ok(StoreSettings.schema.indexes().some(([fields, options]) => fields.key === 1 && options.unique));
});

test('image processing converts supported uploads to WebP and preserves WebP bytes', async () => {
  const png = await sharp({
    create: { width: 3, height: 2, channels: 3, background: { r: 35, g: 90, b: 55 } },
  }).png().toBuffer();
  const converted = await prepareImage(png);
  assert.equal(converted.format, 'webp');
  assert.equal((await sharp(converted.buffer).metadata()).format, 'webp');

  const largePng = await sharp({
    create: { width: 2200, height: 1000, channels: 3, background: { r: 35, g: 90, b: 55 } },
  }).png().toBuffer();
  const optimized = await prepareImage(largePng);
  const optimizedMetadata = await sharp(optimized.buffer).metadata();
  assert.ok(optimizedMetadata.width <= 2048);
  assert.ok(optimizedMetadata.height <= 2048);

  const webp = await sharp(png).webp().toBuffer();
  const preserved = await prepareImage(webp);
  assert.equal(preserved.format, 'webp');
  assert.deepEqual(preserved.buffer, webp);

  const avif = await sharp(png).avif().toBuffer();
  const convertedAvif = await prepareImage(avif);
  assert.equal(convertedAvif.format, 'webp');
  assert.equal((await sharp(convertedAvif.buffer).metadata()).format, 'webp');

  await assert.rejects(prepareImage(Buffer.from('not an image')), /valid supported image/);
});

test('verified admin Google identity can manage products and delivery charges', async () => {
  const post = (path, body, cookie) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Origin: uiOrigin,
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });

  const unauthenticated = await fetch(`${baseUrl}/api/admin/products`);
  assert.equal(unauthenticated.status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/categories`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/orders`)).status, 401);

  const preregisteredAdmin = await post('/api/auth/register', {
    name: 'Admin Account',
    email: 'admin@bb.com',
    password: 'a-preexisting-password',
  });
  assert.equal(preregisteredAdmin.status, 201);
  assert.equal(users[0].role, 'customer');
  assert.ok(users[0].passwordHash);

  const adminLogin = await post('/api/auth/google', { credential: 'a-valid-google-credential' });
  assert.equal(adminLogin.status, 200);
  const adminData = await adminLogin.json();
  assert.equal(adminData.user.email, 'admin@bb.com');
  assert.equal(adminData.user.role, 'admin');
  assert.equal(users[0].role, 'admin');
  assert.equal(users[0].passwordHash, undefined);
  const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0];

  const categoryResponse = await post('/api/admin/categories', {
    name: 'Pantry Staples',
    slug: 'pantry-staples',
    iconUrl: 'https://res.cloudinary.com/test/image/upload/category-icon.webp',
  }, adminCookie);
  assert.equal(categoryResponse.status, 201);
  const categoryData = await categoryResponse.json();
  assert.equal(categoryData.category.iconUrl, 'https://res.cloudinary.com/test/image/upload/category-icon.webp');
  const duplicateCategory = await post('/api/admin/categories', {
    name: 'Another Pantry',
    slug: 'pantry-staples',
  }, adminCookie);
  assert.equal(duplicateCategory.status, 409);
  const legacyCategoryFields = await post('/api/admin/categories', {
    name: 'Millets',
    slug: 'millets',
    imageUrl: 'https://res.cloudinary.com/test/image/upload/category.webp',
    parentId: categoryData.category._id,
  }, adminCookie);
  assert.equal(legacyCategoryFields.status, 400);
  const iconOnlyCategory = await post('/api/admin/categories', {
    name: 'Millets',
    slug: 'millets',
    iconUrl: 'https://res.cloudinary.com/test/image/upload/millets-icon.webp',
  }, adminCookie);
  assert.equal(iconOnlyCategory.status, 201);
  const iconOnlyCategoryData = await iconOnlyCategory.json();
  assert.equal(iconOnlyCategoryData.category.iconUrl, 'https://res.cloudinary.com/test/image/upload/millets-icon.webp');
  assert.equal('imageUrl' in iconOnlyCategoryData.category, false);
  assert.equal('parentId' in iconOnlyCategoryData.category, false);
  assert.equal((await (await fetch(`${baseUrl}/api/storefront/categories`)).json()).categories.length, 2);

  const shortcutIcons = {
    offersIconUrl: 'https://res.cloudinary.com/test/image/upload/offers.webp',
    shopAllIconUrl: 'https://res.cloudinary.com/test/image/upload/shop-all.webp',
  };
  const shortcutIconUpdate = await fetch(`${baseUrl}/api/admin/category-shortcut-icons`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify(shortcutIcons),
  });
  assert.equal(shortcutIconUpdate.status, 200);
  assert.deepEqual(await shortcutIconUpdate.json(), shortcutIcons);
  assert.deepEqual(
    await (await fetch(`${baseUrl}/api/storefront/category-shortcut-icons`)).json(),
    shortcutIcons,
  );
  const externalShortcutIcon = await fetch(`${baseUrl}/api/admin/category-shortcut-icons`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ ...shortcutIcons, offersIconUrl: 'https://images.example.com/offers.png' }),
  });
  assert.equal(externalShortcutIcon.status, 400);

  const passwordLogin = await post('/api/auth/login', {
    email: 'admin@bb.com',
    password: 'a-preexisting-password',
  });
  assert.equal(passwordLogin.status, 401);

  const unauthenticatedUpload = await fetch(`${baseUrl}/api/admin/images`, {
    method: 'POST',
    headers: { Origin: uiOrigin },
  });
  assert.equal(unauthenticatedUpload.status, 401);

  const png = await sharp({
    create: { width: 3, height: 2, channels: 3, background: { r: 35, g: 90, b: 55 } },
  }).png().toBuffer();
  const imageForm = new FormData();
  imageForm.append('image', new Blob([png], { type: 'image/png' }), 'product.png');
  const imageUpload = await fetch(`${baseUrl}/api/admin/images`, {
    method: 'POST',
    headers: { Origin: uiOrigin, Cookie: adminCookie },
    body: imageForm,
  });
  assert.equal(imageUpload.status, 201);
  const imageData = await imageUpload.json();
  assert.equal(imageData.format, 'webp');
  assert.equal(uploadedImage.format, 'webp');
  assert.equal((await sharp(uploadedImage.buffer).metadata()).format, 'webp');
  assert.match(imageData.imageUrl, /^https:\/\/res\.cloudinary\.com\//);

  const webp = await sharp(png).webp().toBuffer();
  const webpForm = new FormData();
  webpForm.append('image', new Blob([webp], { type: 'image/webp' }), 'already.webp');
  const webpUpload = await fetch(`${baseUrl}/api/admin/images`, {
    method: 'POST',
    headers: { Origin: uiOrigin, Cookie: adminCookie },
    body: webpForm,
  });
  assert.equal(webpUpload.status, 201);
  assert.deepEqual(uploadedImage.buffer, webp);

  const customerSignup = await post('/api/auth/register', {
    name: 'Regular Customer',
    email: 'customer@example.com',
    password: 'a-long-enough-password',
  });
  assert.equal(customerSignup.status, 201);
  const customerCookie = customerSignup.headers.get('set-cookie').split(';')[0];
  const forbidden = await fetch(`${baseUrl}/api/admin/products`, { headers: { Cookie: customerCookie } });
  assert.equal(forbidden.status, 403);
  assert.equal((await fetch(`${baseUrl}/api/admin/orders`, { headers: { Cookie: customerCookie } })).status, 403);
  const forbiddenUpdate = await fetch(`${baseUrl}/api/admin/products/0123456789abcdef01234567`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: customerCookie },
    body: '{}',
  });
  assert.equal(forbiddenUpdate.status, 403);

  const customer = users.find((user) => user.email === 'customer@example.com');
  customer.role = 'admin';
  try {
    const forgedAdminProfile = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: customerCookie },
    });
    assert.equal((await forgedAdminProfile.json()).user.role, 'customer');
    const forgedAdminAccess = await fetch(`${baseUrl}/api/admin/products`, {
      headers: { Cookie: customerCookie },
    });
    assert.equal(forgedAdminAccess.status, 403);
  } finally {
    customer.role = 'customer';
  }

  const product = await post('/api/admin/products', {
    name: 'Groundnut Oil 1 L',
    category: 'pantry-staples',
    shortDescription: 'Traditional groundnut oil for everyday cooking.',
    highlights: ['Wood pressed', 'No added preservatives'],
    description: 'Made in small batches using traditional methods.',
    benefits: ['A versatile cooking oil', 'Suitable for everyday recipes'],
    nutritionInfo: 'Energy: 900 kcal per 100 ml\nFat: 100 g per 100 ml',
    howToUse: 'Use for cooking, sauteing, or seasoning.',
    storageInstructions: 'Store in a cool, dry place away from direct sunlight.',
    price: 479,
    mrp: 599,
    variants: [
      { amount: 500, unit: 'ml', price: 259, mrp: 299 },
      { amount: 1, unit: 'l', price: 479, mrp: 599 },
      { amount: 10, unit: 'cm', price: 25, mrp: 30 },
      { amount: 1, unit: 'mtr', price: 100, mrp: 120 },
    ],
    imageUrl: imageData.imageUrl,
    images: [
      imageData.imageUrl,
      'https://res.cloudinary.com/test/image/upload/side.webp',
      'https://res.cloudinary.com/test/image/upload/back.webp',
    ],
  }, adminCookie);
  assert.equal(product.status, 201);
  const productData = await product.json();
  assert.equal(productData.product.name, 'Groundnut Oil 1 L');
  assert.equal(productData.product.shortDescription, 'Traditional groundnut oil for everyday cooking.');
  assert.deepEqual(productData.product.highlights, ['Wood pressed', 'No added preservatives']);
  assert.equal(productData.product.description, 'Made in small batches using traditional methods.');
  assert.deepEqual(productData.product.benefits, ['A versatile cooking oil', 'Suitable for everyday recipes']);
  assert.equal(productData.product.nutritionInfo, 'Energy: 900 kcal per 100 ml\nFat: 100 g per 100 ml');
  assert.equal(productData.product.howToUse, 'Use for cooking, sauteing, or seasoning.');
  assert.equal(productData.product.storageInstructions, 'Store in a cool, dry place away from direct sunlight.');
  assert.equal(productData.product.imageUrl, imageData.imageUrl);
  assert.deepEqual(productData.product.variants.map(({ amount, unit }) => ({ amount, unit })), [
    { amount: 500, unit: 'ml' },
    { amount: 1, unit: 'l' },
    { amount: 10, unit: 'cm' },
    { amount: 1, unit: 'mtr' },
  ]);
  assert.equal(productData.product.price, 259);
  assert.equal(productData.product.mrp, 299);
  assert.deepEqual(productData.product.images, [
    imageData.imageUrl,
    'https://res.cloudinary.com/test/image/upload/side.webp',
    'https://res.cloudinary.com/test/image/upload/back.webp',
  ]);
  assert.equal((await (await fetch(`${baseUrl}/api/products`)).json()).products.length, 1);

  const categoryUpdate = await fetch(`${baseUrl}/api/admin/categories/${categoryData.category._id}`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: 'Pantry Goods',
      slug: 'pantry-goods',
      iconUrl: 'https://res.cloudinary.com/test/image/upload/category-new-icon.webp',
    }),
  });
  assert.equal(categoryUpdate.status, 200);
  assert.equal((await categoryUpdate.json()).category.slug, 'pantry-goods');
  assert.equal(products[0].category, 'pantry-goods');

  const productUpdateBody = {
    name: 'Groundnut Oil, 1 Litre',
    category: 'pantry-goods',
    shortDescription: 'Freshly pressed groundnut oil.',
    highlights: ['Wood pressed'],
    description: 'Updated product details.',
    benefits: ['A versatile cooking oil'],
    nutritionInfo: 'Energy: 900 kcal per 100 ml',
    howToUse: 'Use for cooking.',
    storageInstructions: 'Store in a cool, dry place.',
    price: 250,
    mrp: 300,
    variants: [{ amount: 500, unit: 'ml', price: 250, mrp: 300 }],
    imageUrl: imageData.imageUrl,
    images: [imageData.imageUrl],
  };
  const productUpdate = await fetch(`${baseUrl}/api/admin/products/${productData.product._id}`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify(productUpdateBody),
  });
  assert.equal(productUpdate.status, 200);
  const updatedProductData = await productUpdate.json();
  assert.equal(updatedProductData.product.name, productUpdateBody.name);
  assert.equal(updatedProductData.product.price, 250);
  assert.equal(updatedProductData.product.description, 'Updated product details.');
  assert.deepEqual(updatedProductData.product.images, [imageData.imageUrl]);

  const missingProductEdit = await fetch(`${baseUrl}/api/admin/products/0123456789abcdef01234567`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify(productUpdateBody),
  });
  assert.equal(missingProductEdit.status, 404);

  const invalidProduct = await post('/api/admin/products', {
    name: 'Bad price',
    category: 'pantry-staples',
    price: 600,
    mrp: 500,
    imageUrl: imageData.imageUrl,
  }, adminCookie);
  assert.equal(invalidProduct.status, 400);
  const legacyProductField = await post('/api/admin/products', {
    name: 'Nested product',
    category: 'pantry-goods',
    subcategory: 'millets',
    price: 10,
    mrp: 10,
    imageUrl: imageData.imageUrl,
  }, adminCookie);
  assert.equal(legacyProductField.status, 400);

  const tooManyHighlights = await post('/api/admin/products', {
    name: 'Too many highlights',
    category: 'pantry-staples',
    price: 10,
    mrp: 10,
    imageUrl: imageData.imageUrl,
    highlights: Array(9).fill('Product highlight'),
  }, adminCookie);
  assert.equal(tooManyHighlights.status, 400);

  const duplicateSizes = await post('/api/admin/products', {
    name: 'Duplicate sizes',
    category: 'pantry-goods',
    price: 10,
    mrp: 10,
    variants: [
      { amount: 1, unit: 'kg', price: 10, mrp: 10 },
      { amount: 1, unit: 'kg', price: 9, mrp: 10 },
    ],
    imageUrl: imageData.imageUrl,
  }, adminCookie);
  assert.equal(duplicateSizes.status, 400);

  const tooManyImages = await post('/api/admin/products', {
    name: 'Too many images',
    category: 'pantry-goods',
    price: 10,
    mrp: 10,
    imageUrl: imageData.imageUrl,
    images: Array(4).fill(imageData.imageUrl),
  }, adminCookie);
  assert.equal(tooManyImages.status, 400);

  const wrongMainImage = await post('/api/admin/products', {
    name: 'Wrong main image',
    category: 'pantry-goods',
    price: 10,
    mrp: 10,
    imageUrl: imageData.imageUrl,
    images: ['https://res.cloudinary.com/test/image/upload/other.webp', imageData.imageUrl],
  }, adminCookie);
  assert.equal(wrongMainImage.status, 400);

  const externalImageProduct = await post('/api/admin/products', {
    name: 'External image',
    category: 'pantry-goods',
    price: 10,
    mrp: 10,
    imageUrl: 'https://images.example.com/product.jpg',
  }, adminCookie);
  assert.equal(externalImageProduct.status, 400);

  const categoryInUse = await fetch(`${baseUrl}/api/admin/categories/${categoryData.category._id}`, {
    method: 'DELETE',
    headers: { Origin: uiOrigin, Cookie: adminCookie },
  });
  assert.equal(categoryInUse.status, 409);
  const removedUnusedCategory = await fetch(`${baseUrl}/api/admin/categories/${iconOnlyCategoryData.category._id}`, {
    method: 'DELETE',
    headers: { Origin: uiOrigin, Cookie: adminCookie },
  });
  assert.equal(removedUnusedCategory.status, 204);
  const missingProductImage = await post('/api/admin/products', {
    name: 'Missing image',
    category: 'pantry-staples',
    price: 10,
    mrp: 10,
  }, adminCookie);
  assert.equal(missingProductImage.status, 400);

  const deliveryHeaders = {
    Origin: uiOrigin,
    'Content-Type': 'application/json',
    Cookie: adminCookie,
  };
  const initialDeliverySettings = await fetch(`${baseUrl}/api/admin/delivery-charges`, {
    headers: { Cookie: adminCookie },
  });
  const initialRates = (await initialDeliverySettings.json()).deliveryRates;
  assert.equal(initialRates.length, INDIAN_STATES.length);
  assert.ok(initialRates.every((rate) => rate.deliveryCharge === 0 && rate.enabled === false));
  assert.deepEqual(
    await (await fetch(`${baseUrl}/api/storefront/delivery-charges`)).json(),
    { deliveryOptions: [] },
  );

  const deliveryRates = INDIAN_STATES.map((state) => ({
    state,
    deliveryCharge: state === 'Tamil Nadu' ? 49 : 0,
    enabled: state === 'Tamil Nadu',
  }));
  const invalidDeliveryResponse = await fetch(`${baseUrl}/api/admin/delivery-charges`, {
    method: 'PUT',
    headers: deliveryHeaders,
    body: JSON.stringify({ deliveryRates: deliveryRates.slice(1) }),
  });
  assert.equal(invalidDeliveryResponse.status, 400);

  const deliveryResponse = await fetch(`${baseUrl}/api/admin/delivery-charges`, {
    method: 'PUT',
    headers: deliveryHeaders,
    body: JSON.stringify({ deliveryRates }),
  });
  assert.equal(deliveryResponse.status, 200);
  assert.deepEqual((await deliveryResponse.json()).deliveryRates, deliveryRates);
  assert.deepEqual(
    await (await fetch(`${baseUrl}/api/storefront/delivery-charges`)).json(),
    { deliveryOptions: [{ state: 'Tamil Nadu', deliveryCharge: 49 }] },
  );

  const checkoutBody = {
    customer: {
      name: 'Buyer Example',
      email: 'buyer@example.com',
      phone: '9876543210',
      address: {
        line1: '123 Market Road',
        line2: 'Near the temple',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
      },
    },
    items: [{
      productId: productData.product._id,
      variantId: updatedProductData.product.variants[0]._id,
      quantity: 2,
    }],
  };
  const clientPricedCheckout = await post('/api/checkout/orders', {
    ...checkoutBody,
    items: [{ ...checkoutBody.items[0], unitPricePaise: 1 }],
  });
  assert.equal(clientPricedCheckout.status, 400);

  razorpayResponses.push({
    id: 'order_test001',
    amount: 54900,
    currency: 'INR',
    status: 'created',
  });
  const checkoutResponse = await post('/api/checkout/orders', checkoutBody);
  assert.equal(checkoutResponse.status, 201);
  const checkoutData = await checkoutResponse.json();
  assert.equal(orders.length, 0);
  assert.equal(checkoutData.order.totalPaise, 54900);
  assert.equal(checkoutData.order.deliveryChargePaise, 4900);
  assert.equal(checkoutData.order.keyId, 'rzp_test_id');

  const pendingOrders = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Cookie: adminCookie },
  });
  assert.deepEqual((await pendingOrders.json()).orders, []);

  const paymentCallback = {
    razorpay_order_id: 'order_test001',
    razorpay_payment_id: 'pay_test001',
    razorpay_signature: createHmac('sha256', 'test_razorpay_secret')
      .update('order_test001|pay_test001')
      .digest('hex'),
    checkoutToken: checkoutData.order.checkoutToken,
  };
  const invalidPayment = await post(
    `/api/checkout/orders/${checkoutData.order.razorpayOrderId}/verify`,
    { ...paymentCallback, razorpay_signature: '0'.repeat(64) },
  );
  assert.equal(invalidPayment.status, 400);

  razorpayResponses.push({
    id: 'pay_test001',
    order_id: 'order_test001',
    amount: 54900,
    currency: 'INR',
    status: 'authorized',
  }, {
    id: 'pay_test001',
    order_id: 'order_test001',
    amount: 54900,
    currency: 'INR',
    status: 'captured',
  });
  const verifiedPayment = await post(
    `/api/checkout/orders/${checkoutData.order.razorpayOrderId}/verify`,
    paymentCallback,
  );
  assert.equal(verifiedPayment.status, 200);
  assert.equal((await verifiedPayment.json()).order.paymentStatus, 'paid');

  const paidOrdersResponse = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Cookie: adminCookie },
  });
  const paidOrders = (await paidOrdersResponse.json()).orders;
  assert.equal(paidOrders.length, 1);
  assert.equal(paidOrders[0].status, 'new');
  assert.equal(paidOrders[0].customer.email, 'buyer@example.com');
  assert.equal(paidOrders[0].items[0].lineTotalPaise, 50000);

  const statusUrl = `${baseUrl}/api/admin/orders/${paidOrders[0]._id}/status`;
  const updateStatus = (body, cookie = adminCookie) => fetch(statusUrl, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  const dispatchBeforeAcceptance = await updateStatus({
    status: 'dispatched',
    trackingId: 'TRACK-001',
    trackingUrl: 'https://carrier.example/track/TRACK-001',
  });
  assert.equal(dispatchBeforeAcceptance.status, 409);

  const acceptedOrder = await updateStatus({ status: 'accepted' });
  assert.equal(acceptedOrder.status, 200);
  assert.equal((await acceptedOrder.json()).order.status, 'accepted');

  const incompleteDispatch = await updateStatus({ status: 'dispatched', trackingId: 'TRACK-001' });
  assert.equal(incompleteDispatch.status, 400);
  const insecureTrackingLink = await updateStatus({
    status: 'dispatched',
    trackingId: 'TRACK-001',
    trackingUrl: 'http://carrier.example/track/TRACK-001',
  });
  assert.equal(insecureTrackingLink.status, 400);

  const customerOrderStatusUpdate = await updateStatus({ status: 'accepted' }, customerCookie);
  assert.equal(customerOrderStatusUpdate.status, 403);

  const dispatchedOrder = await updateStatus({
    status: 'dispatched',
    trackingId: 'TRACK-001',
    trackingUrl: 'https://carrier.example/track/TRACK-001',
  });
  assert.equal(dispatchedOrder.status, 200);
  assert.deepEqual(await dispatchedOrder.json(), {
    order: {
      id: paidOrders[0]._id,
      status: 'dispatched',
      trackingId: 'TRACK-001',
      trackingUrl: 'https://carrier.example/track/TRACK-001',
    },
  });

  const terminalOrderUpdate = await updateStatus({ status: 'accepted' });
  assert.equal(terminalOrderUpdate.status, 409);

  const dispatchedOrdersResponse = await fetch(`${baseUrl}/api/admin/orders`, {
    headers: { Cookie: adminCookie },
  });
  const [dispatchedOrderInList] = (await dispatchedOrdersResponse.json()).orders;
  assert.equal(dispatchedOrderInList.status, 'dispatched');
  assert.equal(dispatchedOrderInList.trackingId, 'TRACK-001');

  const removedAdminBannersApi = await fetch(`${baseUrl}/api/admin/banners`, {
    headers: { Cookie: adminCookie },
  });
  assert.equal(removedAdminBannersApi.status, 404);
  const removedStorefrontBannersApi = await fetch(`${baseUrl}/api/storefront/banners`);
  assert.equal(removedStorefrontBannersApi.status, 404);

  const removed = await fetch(`${baseUrl}/api/admin/products/${productData.product._id}`, {
    method: 'DELETE',
    headers: { Origin: uiOrigin, Cookie: adminCookie },
  });
  assert.equal(removed.status, 204);
  const adminMe = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: adminCookie } });
  assert.equal((await adminMe.json()).user.role, 'admin');
});

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { Banner, Category, Product, StoreSettings, User } from '../src/models.js';
import { prepareImage } from '../src/imageProcessing.js';

const uiOrigin = 'http://localhost:5173';
const users = [];
const sessions = [];
const products = [];
const categories = [];
const banners = [];
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
  return document[key] === value;
});
const query = (operation) => {
  const result = Promise.resolve().then(operation);
  result.select = () => result;
  result.populate = () => result;
  result.sort = () => result;
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
      _id: nextObjectId(),
      set(values) { Object.assign(this, values); },
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
    return storeSettings;
  },
};

const FakeBanner = {
  create: async (input) => {
    const banner = { ...input, _id: nextObjectId() };
    banners.push(banner);
    return banner;
  },
  find: (filter) => query(() => banners.filter((item) => matches(item, filter))),
  findByIdAndDelete: async (id) => {
    const index = banners.findIndex((item) => item._id === id);
    return index < 0 ? null : banners.splice(index, 1)[0];
  },
};

before(async () => {
  const app = createApp({
    User: FakeUser,
    Session: FakeSession,
    Product: FakeProduct,
    Category: FakeCategory,
    StoreSettings: FakeStoreSettings,
    Banner: FakeBanner,
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
  assert.equal(typeof Category.schema.path('imageUrl').options.required, 'function');
  assert.equal(new Category({ name: 'Root', slug: 'root' }).validateSync().errors.imageUrl.path, 'imageUrl');
  assert.equal(new Category({ name: 'Child', slug: 'child', parentId: '0123456789abcdef01234567' }).validateSync(), undefined);
  assert.equal(Product.schema.path('imageUrl').options.required, true);
  assert.equal(Product.schema.path('showOnHome').options.default, false);
  assert.equal(Product.schema.path('description').options.default, '');
  assert.equal(new Product().showOnHome, false);
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
  assert.equal(Banner.schema.path('imageUrl').options.required, true);
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

test('verified admin Google identity can manage products, delivery charges, and banners', async () => {
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

  const missingCategoryImage = await post('/api/admin/categories', {
    name: 'No Image',
    slug: 'no-image',
    parentId: null,
  }, adminCookie);
  assert.equal(missingCategoryImage.status, 400);

  const categoryResponse = await post('/api/admin/categories', {
    name: 'Pantry Staples',
    slug: 'pantry-staples',
    imageUrl: 'https://res.cloudinary.com/test/image/upload/category.webp',
    iconUrl: 'https://res.cloudinary.com/test/image/upload/category-icon.webp',
    parentId: null,
  }, adminCookie);
  assert.equal(categoryResponse.status, 201);
  const categoryData = await categoryResponse.json();
  assert.equal(categoryData.category.iconUrl, 'https://res.cloudinary.com/test/image/upload/category-icon.webp');
  const duplicateCategory = await post('/api/admin/categories', {
    name: 'Another Pantry',
    slug: 'pantry-staples',
    imageUrl: 'https://res.cloudinary.com/test/image/upload/category.webp',
    parentId: null,
  }, adminCookie);
  assert.equal(duplicateCategory.status, 409);
  const subcategoryResponse = await post('/api/admin/categories', {
    name: 'Millets',
    slug: 'millets',
    parentId: categoryData.category._id,
  }, adminCookie);
  assert.equal(subcategoryResponse.status, 201);
  const subcategoryData = await subcategoryResponse.json();
  assert.equal(subcategoryData.category.imageUrl, '');
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
  const forbiddenUpdate = await fetch(`${baseUrl}/api/admin/products/0123456789abcdef01234567`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: customerCookie },
    body: '{}',
  });
  assert.equal(forbiddenUpdate.status, 403);

  const product = await post('/api/admin/products', {
    name: 'Groundnut Oil 1 L',
    category: 'pantry-staples',
    showOnHome: true,
    subcategory: 'millets',
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
  assert.equal(productData.product.showOnHome, true);
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
      imageUrl: 'https://res.cloudinary.com/test/image/upload/category-new.webp',
      parentId: null,
    }),
  });
  assert.equal(categoryUpdate.status, 200);
  assert.equal((await categoryUpdate.json()).category.slug, 'pantry-goods');
  assert.equal(products[0].category, 'pantry-goods');

  const subcategoryUpdate = await fetch(`${baseUrl}/api/admin/categories/${subcategoryData.category._id}`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: 'Millet Flour',
      slug: 'millet-flour',
      imageUrl: '',
      parentId: categoryData.category._id,
    }),
  });
  assert.equal(subcategoryUpdate.status, 200);
  assert.equal(products[0].subcategory, 'millet-flour');

  const productUpdateBody = {
    name: 'Groundnut Oil, 1 Litre',
    category: 'pantry-goods',
    showOnHome: false,
    subcategory: 'millet-flour',
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
  assert.equal(updatedProductData.product.showOnHome, false);
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
    subcategory: 'millets',
    price: 600,
    mrp: 500,
    imageUrl: imageData.imageUrl,
  }, adminCookie);
  assert.equal(invalidProduct.status, 400);

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
  const subcategoryInUse = await fetch(`${baseUrl}/api/admin/categories/${subcategoryData.category._id}`, {
    method: 'DELETE',
    headers: { Origin: uiOrigin, Cookie: adminCookie },
  });
  assert.equal(subcategoryInUse.status, 409);
  const missingProductImage = await post('/api/admin/products', {
    name: 'Missing image',
    category: 'pantry-staples',
    price: 10,
    mrp: 10,
  }, adminCookie);
  assert.equal(missingProductImage.status, 400);

  const deliveryResponse = await fetch(`${baseUrl}/api/admin/delivery-charges`, {
    method: 'PUT',
    headers: { Origin: uiOrigin, 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ deliveryCharge: 49, freeShippingThreshold: 999 }),
  });
  assert.equal(deliveryResponse.status, 200);
  assert.deepEqual(await deliveryResponse.json(), { deliveryCharge: 49, freeShippingThreshold: 999 });
  assert.deepEqual(
    await (await fetch(`${baseUrl}/api/storefront/delivery-charges`)).json(),
    { deliveryCharge: 49, freeShippingThreshold: 999 },
  );

  const banner = await post('/api/admin/banners', {
    title: 'Festive collection',
    imageUrl: imageData.imageUrl,
  }, adminCookie);
  assert.equal(banner.status, 201);
  const storefrontBanners = (await (await fetch(`${baseUrl}/api/storefront/banners`)).json()).banners;
  assert.equal(storefrontBanners.length, 1);
  assert.equal('link' in storefrontBanners[0], false);

  const removed = await fetch(`${baseUrl}/api/admin/products/${productData.product._id}`, {
    method: 'DELETE',
    headers: { Origin: uiOrigin, Cookie: adminCookie },
  });
  assert.equal(removed.status, 204);
  const adminMe = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: adminCookie } });
  assert.equal((await adminMe.json()).user.role, 'admin');
});

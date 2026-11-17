import { prepareImage } from '../imageProcessing.js';
import { getDeliveryRates } from '../services/deliveryRates.js';
import {
  categorySchema,
  categoryShortcutIconsSchema,
  deliverySchema,
  objectIdSchema,
  orderStatusUpdateSchema,
  productSchema,
  reviewSchema,
} from '../validation/schemas.js';

export function createAdminController({
  Category,
  Product,
  StoreSettings,
  Order,
  Review,
  uploadImage,
}) {
  return {
    categories: async (_req, res, next) => {
      try {
        return res.json({ categories: await Category.find({}).sort({ name: 1 }).lean() });
      } catch (error) {
        return next(error);
      }
    },

    createCategory: async (req, res, next) => {
      try {
        const input = categorySchema.parse(req.body);
        if (await Category.findOne({ slug: input.slug })) {
          return res.status(409).json({ error: 'A category with this URL already exists' });
        }
        return res.status(201).json({ category: await Category.create(input) });
      } catch (error) {
        return next(error);
      }
    },

    updateCategory: async (req, res, next) => {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const input = categorySchema.parse(req.body);
        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        const duplicate = await Category.findOne({ slug: input.slug });
        if (duplicate && duplicate._id.toString() !== id) {
          return res.status(409).json({ error: 'A category with this URL already exists' });
        }

        const previousSlug = category.slug;
        if (previousSlug !== input.slug) {
          await Product.updateMany({ category: previousSlug }, { $set: { category: input.slug } });
        }
        const updatedCategory = await Category.findByIdAndUpdate(id, input, { new: true, runValidators: true });
        return res.json({ category: updatedCategory });
      } catch (error) {
        return next(error);
      }
    },

    deleteCategory: async (req, res, next) => {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        if (await Product.findOne({ category: category.slug })) {
          return res.status(409).json({ error: 'Move or remove this category’s products first' });
        }
        await Category.findByIdAndDelete(id);
        return res.status(204).end();
      } catch (error) {
        return next(error);
      }
    },

    requireImageStorage: (_req, res, next) => {
      if (!uploadImage) {
        return res.status(503).json({ error: 'Cloudinary image uploads are not configured' });
      }
      return next();
    },

    uploadImage: async (req, res, next) => {
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
    },

    products: async (_req, res, next) => {
      try {
        return res.json({ products: await Product.find({}).sort({ createdAt: -1 }).lean() });
      } catch (error) {
        return next(error);
      }
    },

    orders: async (_req, res, next) => {
      try {
        const orders = await Order.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 }).lean();
        return res.json({ orders });
      } catch (error) {
        return next(error);
      }
    },

    updateOrderStatus: async (req, res, next) => {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const input = orderStatusUpdateSchema.parse(req.body);
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.paymentStatus !== 'paid') {
          return res.status(409).json({ error: 'Only paid orders can be updated' });
        }

        if (order.status === input.status) {
          return res.json({
            order: {
              id: order._id.toString(),
              status: order.status,
              trackingId: order.trackingId,
              trackingUrl: order.trackingUrl,
            },
          });
        }
        const canAccept = order.status === 'new' && input.status === 'accepted';
        const canDispatch = order.status === 'accepted' && input.status === 'dispatched';
        if (!canAccept && !canDispatch) {
          return res.status(409).json({ error: 'Orders must be accepted before they can be dispatched' });
        }

        const update = { status: input.status };
        if (input.status === 'dispatched') {
          update.trackingId = input.trackingId;
          update.trackingUrl = input.trackingUrl;
        }
        const updatedOrder = await Order.findOneAndUpdate(
          { _id: id, paymentStatus: 'paid', status: order.status },
          { $set: update },
          { new: true, runValidators: true },
        );
        if (!updatedOrder) {
          return res.status(409).json({ error: 'Order status changed. Refresh the orders list and try again.' });
        }
        return res.json({
          order: {
            id: updatedOrder._id.toString(),
            status: updatedOrder.status,
            trackingId: updatedOrder.trackingId,
            trackingUrl: updatedOrder.trackingUrl,
          },
        });
      } catch (error) {
        return next(error);
      }
    },

    reviews: async (_req, res, next) => {
      try {
        return res.json({ reviews: await Review.find({}).sort({ createdAt: -1 }).lean() });
      } catch (error) {
        return next(error);
      }
    },

    createReview: async (req, res, next) => {
      try {
        const input = reviewSchema.parse(req.body);
        return res.status(201).json({ review: await Review.create(input) });
      } catch (error) {
        return next(error);
      }
    },

    deleteReview: async (req, res, next) => {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const review = await Review.findByIdAndDelete(id);
        if (!review) return res.status(404).json({ error: 'Review not found' });
        return res.status(204).end();
      } catch (error) {
        return next(error);
      }
    },

    product: async (req, res, next) => {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const product = await Product.findById(id).lean();
        if (!product) return res.status(404).json({ error: 'Product not found' });
        return res.json({ product });
      } catch (error) {
        return next(error);
      }
    },

    createProduct: async (req, res, next) => {
      try {
        const input = productSchema.parse(req.body);
        input.images = input.images?.length ? input.images : [input.imageUrl];
        if (input.variants?.length) {
          input.price = input.variants[0].price;
          input.mrp = input.variants[0].mrp;
        }
        const category = await Category.findOne({ slug: input.category });
        if (!category) return res.status(400).json({ error: 'Choose an existing category' });
        return res.status(201).json({ product: await Product.create(input) });
      } catch (error) {
        return next(error);
      }
    },

    updateProduct: async (req, res, next) => {
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
        const category = await Category.findOne({ slug: input.category });
        if (!category) return res.status(400).json({ error: 'Choose an existing category' });
        product.set(input);
        await product.save();
        return res.json({ product });
      } catch (error) {
        return next(error);
      }
    },

    deleteProduct: async (req, res, next) => {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const product = await Product.findByIdAndDelete(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        return res.status(204).end();
      } catch (error) {
        return next(error);
      }
    },

    deliveryCharges: async (_req, res, next) => {
      try {
        const settings = await StoreSettings.findOne({ key: 'delivery' }).lean();
        return res.json({ deliveryRates: getDeliveryRates(settings) });
      } catch (error) {
        return next(error);
      }
    },

    updateDeliveryCharges: async (req, res, next) => {
      try {
        const input = deliverySchema.parse(req.body);
        const settings = await StoreSettings.findOneAndUpdate(
          { key: 'delivery' },
          {
            $set: input,
            $unset: { deliveryCharge: '', freeShippingThreshold: '' },
            $setOnInsert: { key: 'delivery' },
          },
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true, strict: false },
        );
        return res.json({ deliveryRates: getDeliveryRates(settings) });
      } catch (error) {
        return next(error);
      }
    },

    updateCategoryShortcutIcons: async (req, res, next) => {
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
    },
  };
}

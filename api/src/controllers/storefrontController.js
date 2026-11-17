import { getDeliveryRates } from '../services/deliveryRates.js';

export function createStorefrontController({ Product, Category, StoreSettings, Review }) {
  return {
    health: (_req, res) => res.json({ status: 'ok' }),

    products: async (_req, res, next) => {
      try {
        return res.json({ products: await Product.find({}).sort({ createdAt: -1 }).lean() });
      } catch (error) {
        return next(error);
      }
    },

    categories: async (_req, res, next) => {
      try {
        return res.json({ categories: await Category.find({}).sort({ name: 1 }).lean() });
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

    deliveryCharges: async (_req, res, next) => {
      try {
        const settings = await StoreSettings.findOne({ key: 'delivery' }).lean();
        const deliveryOptions = getDeliveryRates(settings)
          .filter(({ enabled }) => enabled)
          .map(({ state, deliveryCharge }) => ({ state, deliveryCharge }));
        return res.json({ deliveryOptions });
      } catch (error) {
        return next(error);
      }
    },

    categoryShortcutIcons: async (_req, res, next) => {
      try {
        const settings = await StoreSettings.findOne({ key: 'delivery' }).lean();
        return res.json({
          offersIconUrl: settings?.offersIconUrl ?? '',
          shopAllIconUrl: settings?.shopAllIconUrl ?? '',
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}

export function createStorefrontController({ Product, Category, StoreSettings }) {
  return {
    health: (_req, res) => res.json({ status: 'ok' }),

    products: async (_req, res, next) => {
      try {
        return res.json({ products: await Product.find({}).sort({ createdAt: -1 }) });
      } catch (error) {
        return next(error);
      }
    },

    categories: async (_req, res, next) => {
      try {
        return res.json({ categories: await Category.find({}).sort({ name: 1 }) });
      } catch (error) {
        return next(error);
      }
    },

    deliveryCharges: async (_req, res, next) => {
      try {
        const settings = await StoreSettings.findOne({ key: 'delivery' });
        return res.json({
          deliveryCharge: settings?.deliveryCharge ?? 0,
          freeShippingThreshold: settings?.freeShippingThreshold ?? 999,
        });
      } catch (error) {
        return next(error);
      }
    },

    categoryShortcutIcons: async (_req, res, next) => {
      try {
        const settings = await StoreSettings.findOne({ key: 'delivery' });
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

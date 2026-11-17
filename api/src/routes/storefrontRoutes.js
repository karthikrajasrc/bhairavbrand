import { Router } from 'express';

export function createStorefrontRoutes({ controller }) {
  const router = Router();
  router.get('/health', controller.health);
  router.get('/products', controller.products);
  router.get('/storefront/categories', controller.categories);
  router.get('/storefront/reviews', controller.reviews);
  router.get('/storefront/delivery-charges', controller.deliveryCharges);
  router.get('/storefront/category-shortcut-icons', controller.categoryShortcutIcons);
  return router;
}

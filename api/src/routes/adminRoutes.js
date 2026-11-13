import { Router } from 'express';

export function createAdminRoutes({ controller, imageUpload }) {
  const router = Router();
  router.get('/categories', controller.categories);
  router.post('/categories', controller.createCategory);
  router.put('/categories/:id', controller.updateCategory);
  router.delete('/categories/:id', controller.deleteCategory);
  router.post('/images', controller.requireImageStorage, imageUpload, controller.uploadImage);
  router.get('/products', controller.products);
  router.get('/orders', controller.orders);
  router.get('/products/:id', controller.product);
  router.post('/products', controller.createProduct);
  router.put('/products/:id', controller.updateProduct);
  router.delete('/products/:id', controller.deleteProduct);
  router.get('/delivery-charges', controller.deliveryCharges);
  router.put('/delivery-charges', controller.updateDeliveryCharges);
  router.put('/category-shortcut-icons', controller.updateCategoryShortcutIcons);
  return router;
}

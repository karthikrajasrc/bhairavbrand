import { Router } from 'express';

export function createCheckoutRoutes({ controller, limiter }) {
  const router = Router();
  router.post('/quote', limiter, controller.quote);
  router.post('/orders', limiter, controller.requirePaymentConfiguration, controller.createOrder);
  router.post('/orders/:id/verify', limiter, controller.requirePaymentConfiguration, controller.verifyPayment);
  return router;
}

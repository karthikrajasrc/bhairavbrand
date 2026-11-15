import { Router } from 'express';

export function createContactRoutes({ controller, limiter }) {
  const router = Router();
  router.post('/contact', limiter, controller.submitInquiry);
  router.post('/orders/track', limiter, controller.trackOrder);
  return router;
}

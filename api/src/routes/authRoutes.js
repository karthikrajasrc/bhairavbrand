import { Router } from 'express';

export function createAuthRoutes({ controller, limiter, requireUser }) {
  const router = Router();
  router.post('/register', limiter, controller.register);
  router.post('/login', limiter, controller.login);
  router.post('/google', limiter, controller.google);
  router.get('/me', requireUser, controller.me);
  router.post('/logout', requireUser, controller.logout);
  return router;
}

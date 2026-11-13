import multer from 'multer';
import { z } from 'zod';
import { InvalidImageError } from '../imageProcessing.js';
import { PaymentGatewayError } from '../services/razorpayService.js';

export function errorHandler(error, _req, res, _next) {
  if (error instanceof PaymentGatewayError) {
    return res.status(502).json({ error: error.message });
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Image must be 8 MB or smaller'
      : 'Upload one image at a time';
    return res.status(status).json({ error: message });
  }
  if (error instanceof InvalidImageError || error.status === 400) {
    return res.status(400).json({ error: error.message });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: 'Please check the provided information', fields: error.flatten().fieldErrors });
  }
  if (error.name === 'ValidationError' && error.errors) {
    return res.status(400).json({
      error: 'Please check the provided information',
      fields: Object.fromEntries(Object.entries(error.errors).map(([field, fieldError]) => (
        [field, fieldError.message]
      ))),
    });
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }
  if (error.message === 'Origin is not allowed') {
    return res.status(403).json({ error: 'Origin is not allowed' });
  }
  console.error('API request failed:', error);
  return res.status(500).json({ error: 'An unexpected server error occurred' });
}

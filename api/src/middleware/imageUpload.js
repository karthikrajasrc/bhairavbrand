import multer from 'multer';

export function createImageUploadMiddleware() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter(_req, file, callback) {
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff']);
      if (!allowedTypes.has(file.mimetype)) {
        const error = new Error('Choose a JPEG, PNG, WebP, AVIF, or TIFF image');
        error.status = 400;
        callback(error);
        return;
      }
      callback(null, true);
    },
  }).single('image');
}

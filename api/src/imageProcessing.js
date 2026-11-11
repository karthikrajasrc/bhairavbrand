import sharp from 'sharp';

const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'tiff']);

export class InvalidImageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidImageError';
  }
}

export async function prepareImage(buffer) {
  let image;
  let metadata;
  try {
    image = sharp(buffer, { limitInputPixels: 40000000 });
    metadata = await image.metadata();
  } catch {
    throw new InvalidImageError('The uploaded file is not a valid supported image');
  }

  const isAvif = metadata.format === 'heif' && metadata.compression === 'av1';
  if (!SUPPORTED_FORMATS.has(metadata.format) && !isAvif) {
    throw new InvalidImageError('Only JPEG, PNG, WebP, AVIF, and TIFF images are supported');
  }

  if (metadata.format === 'webp') return { buffer, format: 'webp' };

  try {
    return {
      buffer: await image
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, effort: 4 })
        .toBuffer(),
      format: 'webp',
    };
  } catch {
    throw new InvalidImageError('The uploaded image could not be converted to WebP');
  }
}

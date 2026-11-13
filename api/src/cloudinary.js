import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

export function createCloudinaryImageUploader({ cloudName, apiKey, apiSecret }) {
  if (!cloudName || !apiKey || !apiSecret) return null;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return ({ buffer }) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: 'bhairav-brand',
      public_id: randomUUID(),
      resource_type: 'image',
      overwrite: false,
    }, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      if (!result?.secure_url || !result.secure_url.startsWith('https://res.cloudinary.com/')) {
        reject(new Error('Cloudinary returned an invalid secure image URL'));
        return;
      }
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

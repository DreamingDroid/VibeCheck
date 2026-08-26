import { v2 as cloudinary } from 'cloudinary';
import { config } from './config';

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a base64 encoded image string to Cloudinary.
 * @param base64Data The base64 data string (e.g. data:image/png;base64,...)
 */
export async function uploadImage(base64Data: string): Promise<{ url: string; publicId: string }> {
  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'vibecheck',
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Deletes an image from Cloudinary by its public ID.
 * @param publicId The public ID of the resource to destroy
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary destroy error:', error);
    return false;
  }
}

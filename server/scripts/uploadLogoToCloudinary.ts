import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config';

async function main() {
  if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY) {
    console.log('[Cloudinary] Missing credentials');
    return;
  }

  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET
  });

  const logoPath = path.join(__dirname, '../src/assets/logo.png');
  const res = await cloudinary.uploader.upload(logoPath, {
    public_id: 'vibecheck_brand_logo',
    overwrite: true,
    folder: 'vibecheck_assets'
  });

  console.log('[Cloudinary] Logo uploaded permanently! Secure URL:', res.secure_url);
}

main().catch(console.error);

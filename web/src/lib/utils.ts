import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Injects Cloudinary transformations (e.g. f_auto,q_auto) into a raw secure_url
 * to significantly reduce image payload sizes.
 */
export function optimizeCloudinaryUrl(url: string, transformations: string = 'f_auto,q_auto'): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  // Cloudinary URLs typically look like:
  // https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/image.jpg
  // We want to insert the transformations right after '/upload/'
  
  const uploadToken = '/upload/';
  const uploadIndex = url.indexOf(uploadToken);
  
  if (uploadIndex === -1) return url; // if it's a weird format, return as is
  
  const beforeUpload = url.substring(0, uploadIndex + uploadToken.length);
  const afterUpload = url.substring(uploadIndex + uploadToken.length);
  
  // Prevent duplicate transformations if they somehow already exist
  if (afterUpload.startsWith(transformations)) return url;
  
  return `${beforeUpload}${transformations}/${afterUpload}`;
}

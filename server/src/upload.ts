import { Request, Response } from 'express';
import { Pool } from 'pg';
import { uploadImage } from './cloudinary';

export async function uploadImageHandler(req: Request, res: Response, pool: Pool) {
  const { email, image } = req.body;
  if (!email || !image) {
    return res.status(400).json({ success: false, error: 'email and image (base64 string) are required' });
  }

  try {
    // Check if the email belongs to an authorized user:
    // 1. Web Editor
    const webUserResult = await pool.query('SELECT is_editor FROM web_users WHERE email = $1', [email]);
    const isWebUserEditor = webUserResult.rows.length > 0 && webUserResult.rows[0].is_editor === true;

    // 2. Admin or Approved Organizer
    const adminResult = await pool.query('SELECT role, status FROM admins WHERE email = $1', [email]);
    let isAllowed = isWebUserEditor;
    if (adminResult.rows.length > 0) {
      const { role, status } = adminResult.rows[0];
      const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
      if (normalizedRole === 'superadmin' || normalizedRole === 'editor') {
        isAllowed = true;
      } else if (normalizedRole === 'organizer' && status === 'approved') {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Permission required to upload images' });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadImage(image);
    res.json({ success: true, data: uploadResult });
  } catch (error: any) {
    console.error('Image upload handler error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image. Storage service authentication failed.' });
  }
}

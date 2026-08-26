import { Request, Response } from 'express';
import { Pool } from 'pg';
import { deleteImage } from './cloudinary';

async function checkIsEditor(pool: Pool, email: string): Promise<boolean> {
  if (!email) return false;
  try {
    const webUserResult = await pool.query('SELECT is_editor FROM web_users WHERE email = $1', [email]);
    if (webUserResult.rows.length > 0 && webUserResult.rows[0].is_editor === true) {
      return true;
    }
    const adminResult = await pool.query('SELECT role FROM admins WHERE email = $1', [email]);
    if (adminResult.rows.length > 0) {
      const role = adminResult.rows[0].role;
      const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
      if (normalizedRole === 'editor' || normalizedRole === 'superadmin') {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking editor status:', error);
    return false;
  }
}

export async function getNewsArticlesHandler(req: Request, res: Response, pool: Pool) {
  const { city } = req.query;
  try {
    let result;
    if (city) {
      result = await pool.query(
        'SELECT * FROM news_articles WHERE city = $1 ORDER BY created_at DESC',
        [city]
      );
    } else {
      result = await pool.query('SELECT * FROM news_articles ORDER BY created_at DESC');
    }
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLatestNewsArticlesHandler(req: Request, res: Response, pool: Pool) {
  const { city } = req.query;
  try {
    let result;
    if (city) {
      result = await pool.query(
        'SELECT * FROM news_articles WHERE city = $1 ORDER BY created_at DESC LIMIT 3',
        [city]
      );
    } else {
      result = await pool.query('SELECT * FROM news_articles ORDER BY created_at DESC LIMIT 3');
    }
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function adminCreateNewsArticleHandler(req: Request, res: Response, pool: Pool) {
  const { title, content, category, author, image_url, image_public_id, email, city } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, error: 'title and content are required' });
  }
  if (!email) {
    return res.status(400).json({ success: false, error: 'email is required to verify permissions' });
  }

  try {
    const isEditor = await checkIsEditor(pool, email);
    if (!isEditor) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Editor role required' });
    }

    const result = await pool.query(
      `INSERT INTO news_articles (title, content, category, author, image_url, image_public_id, city) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [title, content, category || 'General', author || 'VibeCheck Editorial', image_url || null, image_public_id || null, city || 'Vizag']
    );

    res.json({ success: true, data: result.rows[0], message: 'Article created successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function adminUpdateNewsArticleArticleHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { title, content, category, author, image_url, image_public_id, email, city } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'email is required to verify permissions' });
  }

  try {
    const isEditor = await checkIsEditor(pool, email);
    if (!isEditor) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Editor role required' });
    }

    const result = await pool.query(
      `UPDATE news_articles 
       SET title = $1, content = $2, category = $3, author = $4, image_url = $5, image_public_id = $6, city = $7, updated_at = NOW() 
       WHERE id = $8 
       RETURNING *`,
      [title, content, category || 'General', author || 'VibeCheck Editorial', image_url || null, image_public_id || null, city || 'Vizag', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Article updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function adminDeleteNewsArticleHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { email } = req.body;

  const userEmail = email || req.query.email;

  if (!userEmail || typeof userEmail !== 'string') {
    return res.status(400).json({ success: false, error: 'email is required to verify permissions' });
  }

  try {
    const isEditor = await checkIsEditor(pool, userEmail);
    if (!isEditor) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Editor role required' });
    }

    const result = await pool.query('DELETE FROM news_articles WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    const deletedArticle = result.rows[0];
    if (deletedArticle.image_public_id) {
      await deleteImage(deletedArticle.image_public_id);
    }

    res.json({ success: true, message: 'Article deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

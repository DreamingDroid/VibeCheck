import { Request, Response } from 'express';
import { Pool } from 'pg';

export async function getCitiesHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { rows } = await pool.query('SELECT * FROM cities ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

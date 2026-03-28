import { Request, Response } from 'express';
import { Pool } from 'pg';

export async function getEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { category, search } = req.query;
    
    let queryText = `
      SELECT id, title, description, location, date_time, category 
      FROM events
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'All') {
      // Must cast the parameter to the specific enum type for Postgres
      queryText += ` AND category = $${paramIndex}::event_category`;
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY date_time ASC LIMIT 50;`;

    const result = await pool.query(queryText, queryParams);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

import { Pool } from 'pg';

export async function getSystemSetting(pool: Pool, key: string) {
  const { rows } = await pool.query(`SELECT value FROM system_settings WHERE key = $1`, [key]);
  return rows[0]?.value || null;
}

export async function initSystemSettings(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT 'null'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('cron_enabled', 'false'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  `);
}

export async function getAnalyticsOverview(pool: Pool) {
  // To be used by admin.ts
  const eventsCountResult = await pool.query(`SELECT COUNT(*) as count FROM events`);
  const webUsersCountResult = await pool.query(`SELECT COUNT(*) as count FROM web_users`);
  const whatsappUsersCountResult = await pool.query(`SELECT COUNT(*) as count FROM users`);

  return {
    totalEvents: parseInt(eventsCountResult.rows[0].count, 10),
    webUsers: parseInt(webUsersCountResult.rows[0].count, 10),
    whatsappUsers: parseInt(whatsappUsersCountResult.rows[0].count, 10)
  };
}

export async function getEventsByCategoryStats(pool: Pool) {
  // To be used by admin.ts
  const { rows } = await pool.query(`
    SELECT category as name, COUNT(*) as value 
    FROM events 
    GROUP BY category
    ORDER BY value DESC
  `);
  return rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) }));
}

export async function getPreferredCategoriesStats(pool: Pool) {
  // To be used by admin.ts
  const { rows } = await pool.query(`
    SELECT category_name as name, COUNT(*) as value
    FROM (
      SELECT jsonb_array_elements_text(categories) as category_name
      FROM web_users
      WHERE categories IS NOT NULL AND jsonb_array_length(categories) > 0
    ) sub
    GROUP BY category_name
    ORDER BY value DESC
  `);
  return rows.map((r: any) => ({ ...r, value: parseInt(r.value, 10) }));
}

export async function toggleCronSetting(pool: Pool, enabled: boolean) {
  const value = enabled ? 'true' : 'false';
  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('cron_enabled', $1::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
  `, [JSON.stringify(value)]);
}

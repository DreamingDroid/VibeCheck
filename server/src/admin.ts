import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getAdminByEmail, addOrganizer, getOrganizers } from './queries/admins';
import { getAllEvents, createEvent, updateEvent, deleteEvent, getPendingEvents, updateEventStatus, getEventsByStatus, getAdminEventRSVPs, addCity, deleteCity } from './queries/events';
import { initSystemSettings, getSystemSetting, getAnalyticsOverview, getEventsByCategoryStats, getPreferredCategoriesStats, toggleCronSetting } from './queries/analytics';

// Check if an email belongs to an admin
export async function checkAdminHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email required' });
  }
  try {
    const adminStr = await getAdminByEmail(pool, email as string);
    if (!adminStr) {
      return res.json({ success: true, isAdmin: false, isOrganizer: false });
    }
    const role = adminStr.role;
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
    return res.json({
      success: true,
      isAdmin: normalizedRole !== 'organizer',
      isOrganizer: normalizedRole === 'organizer',
      role
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Get all events (admin view - no limit)
export async function adminGetEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const rows = await getAllEvents(pool);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Create a new event
export async function adminCreateEventHandler(req: Request, res: Response, pool: Pool) {
  const { title, description, category, date_time } = req.body;
  if (!title || !description || !category || !date_time) {
    return res.status(400).json({ success: false, error: 'title, description, category, and date_time are required' });
  }
  try {
    const event = await createEvent(pool, req.body);
    res.json({ success: true, data: event, message: 'Event created successfully.' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Update an event
export async function adminUpdateEventHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    await updateEvent(pool, id as string, req.body);
    res.json({ success: true, message: 'Event updated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Delete an event
export async function adminDeleteEventHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    await deleteEvent(pool, id as string);
    res.json({ success: true, message: 'Event deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Analytics data
export async function adminAnalyticsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const overview = await getAnalyticsOverview(pool);
    const eventsByCategory = await getEventsByCategoryStats(pool);
    const topPreferences = await getPreferredCategoriesStats(pool);

    res.json({
      success: true,
      data: {
        eventsByCategory: eventsByCategory,
        totalEvents: overview.totalEvents,
        totalWebUsers: overview.webUsers,
        totalWhatsappUsers: overview.whatsappUsers,
        topPreferences: topPreferences.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Get system settings
export async function adminGetSettingsHandler(req: Request, res: Response, pool: Pool) {
  try {
    await initSystemSettings(pool);
    // Directly query for all settings to reconstruct the Record<string, unknown>
    const { rows } = await pool.query(`SELECT key, value FROM system_settings`);
    const settings = rows.reduce<Record<string, unknown>>((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Update system setting
export async function adminUpdateSettingsHandler(req: Request, res: Response, pool: Pool) {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ success: false, error: 'key and value required' });
  try {
    await initSystemSettings(pool);
    if (key === 'cron_enabled') {
      await toggleCronSetting(pool, value === true || value === 'true');
    } else {
      await pool.query(
        `INSERT INTO system_settings (key, value) VALUES ($1, $2::jsonb)
          ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value)]
      );
    }
    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Get RSVPs for a single event
export async function adminGetEventRsvpsHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    const rows = await getAdminEventRSVPs(pool, id as string);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('RSVP Admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// --- NEW FEATURES For Organizer / Approval Flow ---

export async function adminAddOrganizerHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  try {
    await addOrganizer(pool, email);
    res.json({ success: true, message: 'Organizer added successfully.' });
  } catch (error) {
    console.error('Add organizer error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminGetOrganizersHandler(req: Request, res: Response, pool: Pool) {
  try {
    const rows = await getOrganizers(pool);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get organizers error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminGetPendingEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const rows = await getPendingEvents(pool);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminReviewEventHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { status, comment } = req.body; // 'approved', 'rejected', or 'needs_changes'
  if (!['approved', 'rejected', 'needs_changes'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status. Must be approved, rejected, or needs_changes.' });
  }
  try {
    const rowCount = await updateEventStatus(pool, id as string, status, comment || null);
    if (rowCount === 0) return res.status(404).json({ success: false, error: 'Event not found' });
    const messages: Record<string, string> = {
      approved: 'Event approved and published.',
      rejected: 'Event rejected.',
      needs_changes: 'Organizer notified to update the event.',
    };
    res.json({ success: true, message: messages[status] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminGetEventsByStatusHandler(req: Request, res: Response, pool: Pool) {
  const { status } = req.params;
  const days = req.query.days ? parseInt(req.query.days as string) : undefined;
  try {
    const rows = await getEventsByStatus(pool, status as string, days);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// --- CITY MANAGEMENT ---

export async function adminAddCityHandler(req: Request, res: Response, pool: Pool) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'City name required' });
  try {
    const city = await addCity(pool, name);
    res.json({ success: true, data: city, message: 'City added successfully.' });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'City already exists' });
    }
    console.error('Add city error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminDeleteCityHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    const rowCount = await deleteCity(pool, id as string);
    if (rowCount === 0) return res.status(404).json({ success: false, error: 'City not found' });
    res.json({ success: true, message: 'City deleted successfully.' });
  } catch (error) {
    console.error('Delete city error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

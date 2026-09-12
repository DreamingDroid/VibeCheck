import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getAdminByEmail, addOrganizer, getOrganizers, getPendingOrganizers, updateOrganizerStatus, getAdmins, addAdmin, removeAdmin, deleteOrganizer } from './queries/admins';
import { Resend } from 'resend';
import { config } from './config';

const resend = new Resend(config.RESEND_API_KEY);
import { getAllEvents, createEvent, updateEvent, deleteEvent, getPendingEvents, updateEventStatus, getEventsByStatus, getAdminEventRSVPs, addCity, deleteCity } from './queries/events';
import { initSystemSettings, getSystemSetting, getAnalyticsOverview, getEventsByCategoryStats, getPreferredCategoriesStats, toggleCronSetting } from './queries/analytics';
import { searchOrganizers, searchAttendees, searchEvents, searchGlobal, getAttendeeDeepDetails, getOrganizerDeepDetails, getEventDeepDetails } from './queries/search';
import { deleteImage } from './cloudinary';
import { notifyOrganizer } from './notifications';

// Check if an email belongs to an admin
export async function checkAdminHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email required' });
  }
  try {
    const webUserResult = await pool.query('SELECT is_editor FROM web_users WHERE email = $1', [email]);
    const isWebUserEditor = webUserResult.rows.length > 0 && webUserResult.rows[0].is_editor === true;

    const adminStr = await getAdminByEmail(pool, email as string);
    if (!adminStr) {
      return res.json({ 
        success: true, 
        isAdmin: false, 
        isOrganizer: false,
        isEditor: isWebUserEditor 
      });
    }
    const role = adminStr.role;
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
    const isAdmin = normalizedRole === 'superadmin';
    const isOrganizer = normalizedRole === 'organizer';
    const isEditor = normalizedRole === 'editor' || normalizedRole === 'superadmin' || isWebUserEditor;

    return res.json({
      success: true,
      isAdmin,
      isOrganizer,
      isEditor,
      role,
      status: adminStr.status,
      rejectionReason: adminStr.rejection_reason
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
    const deletedEvent = await deleteEvent(pool, id as string);
    if (deletedEvent && deletedEvent.image_public_id) {
      await deleteImage(deletedEvent.image_public_id);
    }
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

export async function adminGetPendingOrganizersHandler(req: Request, res: Response, pool: Pool) {
  try {
    const rows = await getPendingOrganizers(pool);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get pending organizers error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminApproveOrganizerHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    const row = await updateOrganizerStatus(pool, id as string, 'approved');
    if (!row) return res.status(404).json({ success: false, error: 'Organizer not found' });
    
    // Send in-app notification + email to the organizer
    notifyOrganizer(pool, {
      organizerEmail: row.email,
      title: 'Organizer Application Approved! 🎉',
      message: 'Congratulations! Your organizer application has been approved. You now have full access to create events and access the Organizer Hub.',
      type: 'application_approved',
      link: '/organizer',
      metadata: { status: 'approved' },
      emailSubject: 'Welcome to VibeCheck! Your Organizer Application is Approved 🎉',
      emailHtml: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981; margin-top: 0;">Congratulations! Your Application is Approved 🎉</h2>
          <p>Great news! Your organizer application for VibeCheck Space has been reviewed and approved.</p>
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46; font-weight: 500;">You can now log in, publish events, track RSVPs, issue digital passes, and broadcast live announcements to your attendees.</p>
          </div>
          <div style="margin-top: 24px;">
            <a href="${config.WEB_APP_URL}/organizer" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Open Organizer Dashboard &rarr;</a>
          </div>
        </div>
      `
    }).catch(err => console.warn('[Notifications] Error in notifyOrganizer on approve:', err.message));

    res.json({ success: true, message: 'Organizer approved successfully.' });
  } catch (error) {
    console.error('Approve organizer error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminRejectOrganizerHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: 'Rejection reason is required' });
  
  try {
    const row = await updateOrganizerStatus(pool, id as string, 'rejected', reason);
    if (!row) return res.status(404).json({ success: false, error: 'Organizer not found' });

    // Send in-app notification + email to the organizer
    notifyOrganizer(pool, {
      organizerEmail: row.email,
      title: 'Organizer Application Update',
      message: `Your organizer application was not approved. Reason: ${reason}`,
      type: 'application_rejected',
      link: '/organizer/apply',
      metadata: { status: 'rejected', reason },
      emailSubject: 'Update on your VibeCheck Application',
      emailHtml: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ef4444; margin-top: 0;">Organizer Application Status Update</h2>
          <p>Thank you for applying to become an organizer on VibeCheck. Our team has reviewed your application.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: bold;">Review Feedback:</p>
            <blockquote style="margin: 0; padding-left: 12px; border-left: 3px solid #ef4444; color: #7f1d1d;">${reason}</blockquote>
          </div>
          <p>You may update your details and submit a new application anytime.</p>
          <div style="margin-top: 24px;">
            <a href="${config.WEB_APP_URL}/organizer/apply" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Re-apply as Organizer &rarr;</a>
          </div>
        </div>
      `
    }).catch(err => console.warn('[Notifications] Error in notifyOrganizer on reject:', err.message));

    res.json({ success: true, message: 'Organizer rejected successfully.' });
  } catch (error) {
    console.error('Reject organizer error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminDeleteOrganizerHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    const deleted = await deleteOrganizer(pool, id as string);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Organizer not found' });
    }
    res.json({ success: true, data: deleted, message: 'Organizer deleted successfully.' });
  } catch (error) {
    console.error('Delete organizer error:', error);
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
    // Fetch event details for notification recipient
    const { rows: eventRows } = await pool.query(
      `SELECT title, organizer_email FROM events WHERE id = $1`,
      [id]
    );
    const event = eventRows[0];

    const rowCount = await updateEventStatus(pool, id as string, status, comment || null);
    if (rowCount === 0) return res.status(404).json({ success: false, error: 'Event not found' });

    // Notify the organizer if organizer_email exists
    if (event?.organizer_email) {
      if (status === 'approved') {
        notifyOrganizer(pool, {
          organizerEmail: event.organizer_email,
          title: `Event Approved: ${event.title} 🚀`,
          message: `Great news! Your event "${event.title}" has been approved and is now live on VibeCheck!`,
          type: 'event_approved',
          link: `/event/${id}`,
          metadata: { event_id: id, status: 'approved' },
          emailSubject: `Your Event is Approved & Published: ${event.title} 🚀`,
          emailHtml: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981; margin-top: 0;">Your Event is Live! 🚀</h2>
              <p>Congratulations! Your event <strong>"${event.title}"</strong> has been approved by the editorial team and is now live for discovery and RSVPs.</p>
              <div style="margin-top: 24px;">
                <a href="${config.WEB_APP_URL}/event/${id}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Published Event &rarr;</a>
              </div>
            </div>
          `
        }).catch(err => console.warn('[Notifications] Error in notifyOrganizer on event approve:', err.message));
      } else if (status === 'rejected') {
        notifyOrganizer(pool, {
          organizerEmail: event.organizer_email,
          title: `Event Rejected: ${event.title}`,
          message: `Your event "${event.title}" was not approved.${comment ? ` Reason: ${comment}` : ''}`,
          type: 'event_rejected',
          link: '/organizer',
          metadata: { event_id: id, status: 'rejected', comment },
          emailSubject: `Update on your Event Submission: ${event.title}`,
          emailHtml: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #ef4444; margin-top: 0;">Event Submission Update</h2>
              <p>We have reviewed your event submission for <strong>"${event.title}"</strong>.</p>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: bold;">Review Feedback:</p>
                <blockquote style="margin: 0; padding-left: 12px; border-left: 3px solid #ef4444; color: #7f1d1d;">${comment || 'Event does not meet current publishing criteria.'}</blockquote>
              </div>
              <div style="margin-top: 24px;">
                <a href="${config.WEB_APP_URL}/organizer" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Visit Organizer Hub &rarr;</a>
              </div>
            </div>
          `
        }).catch(err => console.warn('[Notifications] Error in notifyOrganizer on event reject:', err.message));
      } else if (status === 'needs_changes') {
        notifyOrganizer(pool, {
          organizerEmail: event.organizer_email,
          title: `Action Required: ${event.title} ✏️`,
          message: `Your event "${event.title}" requires updates before approval.${comment ? ` Admin note: ${comment}` : ''}`,
          type: 'event_needs_changes',
          link: '/organizer',
          metadata: { event_id: id, status: 'needs_changes', comment },
          emailSubject: `Action Required for your Event: ${event.title}`,
          emailHtml: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #f59e0b; margin-top: 0;">Action Required: Updates Needed ✏️</h2>
              <p>Our editorial team reviewed your event <strong>"${event.title}"</strong> and requested a few changes before it can be published.</p>
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-weight: bold;">Requested Updates:</p>
                <blockquote style="margin: 0; padding-left: 12px; border-left: 3px solid #f59e0b; color: #78350f;">${comment || 'Please update the event details.'}</blockquote>
              </div>
              <p>Please edit your event in the Organizer Hub and resubmit it for review.</p>
              <div style="margin-top: 24px;">
                <a href="${config.WEB_APP_URL}/organizer" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Edit & Resubmit Event &rarr;</a>
              </div>
            </div>
          `
        }).catch(err => console.warn('[Notifications] Error in notifyOrganizer on event needs_changes:', err.message));
      }
    }

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
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'City name required' });
  }
  const formattedName = name.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  try {
    const city = await addCity(pool, formattedName);
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

// --- ADMIN MANAGEMENT ---

export async function adminGetAdminsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const rows = await getAdmins(pool);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminAddAdminHandler(req: Request, res: Response, pool: Pool) {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ success: false, error: 'Email and role are required' });
  }
  if (role !== 'SuperAdmin' && role !== 'Editor') {
    return res.status(400).json({ success: false, error: 'Invalid role. Must be SuperAdmin or Editor' });
  }
  try {
    const admin = await addAdmin(pool, email, role);
    res.json({ success: true, data: admin, message: 'Admin added successfully.' });
  } catch (error: any) {
    console.error('Add admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminRemoveAdminHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    const success = await removeAdmin(pool, id as string);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    res.json({ success: true, message: 'Admin removed successfully.' });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// --- UNIVERSAL DATABASE SEARCH & EXPLORER ---

export async function adminSearchHandler(req: Request, res: Response, pool: Pool) {
  const { 
    q, 
    type = 'all', 
    status, 
    platform, 
    city, 
    category, 
    isPaid, 
    timeframe, 
    organizerEmail, 
    hasRsvps,
    sortBy, 
    sortOrder, 
    limit = '50', 
    offset = '0' 
  } = req.query;

  const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 200);
  const parsedOffset = Math.max(parseInt(offset as string, 10) || 0, 0);
  const queryStr = typeof q === 'string' ? q : '';

  try {
    if (type === 'all') {
      const results = await searchGlobal(pool, queryStr, parsedLimit);
      return res.json({ success: true, ...results });
    }

    if (type === 'organizers') {
      const results = await searchOrganizers(pool, {
        q: queryStr,
        status: typeof status === 'string' ? status : undefined,
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortOrder: sortOrder === 'ASC' || sortOrder === 'asc' ? 'ASC' : 'DESC',
        limit: parsedLimit,
        offset: parsedOffset
      });
      return res.json({ success: true, ...results });
    }

    if (type === 'attendees') {
      const results = await searchAttendees(pool, {
        q: queryStr,
        platform: platform as any,
        city: typeof city === 'string' ? city : undefined,
        category: typeof category === 'string' ? category : undefined,
        hasRsvps: hasRsvps === 'true',
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortOrder: sortOrder === 'ASC' || sortOrder === 'asc' ? 'ASC' : 'DESC',
        limit: parsedLimit,
        offset: parsedOffset
      });
      return res.json({ success: true, ...results });
    }

    if (type === 'events') {
      const results = await searchEvents(pool, {
        q: queryStr,
        category: typeof category === 'string' ? category : undefined,
        status: typeof status === 'string' ? status : undefined,
        city: typeof city === 'string' ? city : undefined,
        isPaid: typeof isPaid === 'string' ? isPaid : undefined,
        timeframe: typeof timeframe === 'string' ? timeframe : undefined,
        organizerEmail: typeof organizerEmail === 'string' ? organizerEmail : undefined,
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortOrder: sortOrder === 'ASC' || sortOrder === 'asc' ? 'ASC' : 'DESC',
        limit: parsedLimit,
        offset: parsedOffset
      });
      return res.json({ success: true, ...results });
    }

    return res.status(400).json({ success: false, error: 'Invalid search type. Expected all, organizers, attendees, or events.' });
  } catch (error) {
    console.error('Admin search error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during search' });
  }
}

export async function adminAttendeeDetailsHandler(req: Request, res: Response, pool: Pool) {
  const { email, phone } = req.query;
  if (!email && !phone) {
    return res.status(400).json({ success: false, error: 'email or phone query parameter is required' });
  }

  try {
    const details = await getAttendeeDeepDetails(pool, email as string | undefined, phone as string | undefined);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Attendee not found' });
    }
    res.json({ success: true, data: details });
  } catch (error) {
    console.error('Admin attendee details error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminOrganizerDetailsHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, error: 'email query parameter is required' });
  }

  try {
    const details = await getOrganizerDeepDetails(pool, email as string);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Organizer not found' });
    }
    res.json({ success: true, data: details });
  } catch (error) {
    console.error('Admin organizer details error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminEventDetailsHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: 'id query parameter is required' });
  }

  try {
    const details = await getEventDeepDetails(pool, id as string);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, data: details });
  } catch (error) {
    console.error('Admin event details error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}


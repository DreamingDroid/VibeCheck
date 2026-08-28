import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  estimateAudienceCount,
  createBroadcastAndDispatch,
  getBroadcastsHistory,
  getOrganizerBroadcastsHistory,
  getUserNotifications,
  getUserUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  upsertUserFcmToken,
  getUserFcmTokens,
  deleteUserFcmToken,
  BroadcastTargetParams,
  CreateBroadcastInput
} from './queries/broadcasts';
import { getAdminByEmail } from './queries/admins';
import { getEventById } from './queries/events';
import { sendFcmTopicBroadcast, subscribeTokensToTopics, unsubscribeTokensFromTopics } from './firebaseAdmin';

const VALID_MESSAGE_TYPES = [
  'general_update',
  'event_reminder',
  'emergency_alert',
  'agenda_shift',
  'event_rescheduled',
  'event_cancellation'
] as const;

const VALID_SCOPES = ['global', 'city', 'event', 'category'] as const;

/**
 * GET /api/admin/broadcasts/recipients-count
 */
export async function getAudienceEstimateHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { scope, city, eventId, category } = req.query;

    if (!scope || typeof scope !== 'string' || !VALID_SCOPES.includes(scope as any)) {
      return res.status(400).json({ success: false, error: 'Valid scope required (global, city, event, category)' });
    }

    const params: BroadcastTargetParams = {
      scope: scope as any,
      city: typeof city === 'string' ? city : undefined,
      eventId: typeof eventId === 'string' ? eventId : undefined,
      category: typeof category === 'string' ? category : undefined
    };

    const estimate = await estimateAudienceCount(pool, params);
    return res.json({ success: true, data: estimate });
  } catch (error: any) {
    console.error('Error estimating audience count:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/admin/broadcasts
 */
export async function adminSendBroadcastHandler(req: Request, res: Response, pool: Pool) {
  try {
    const {
      title,
      message,
      type,
      scope,
      target_city,
      target_event_id,
      target_category,
      admin_email,
      link,
      metadata
    } = req.body;

    if (!title || !message || !type || !scope || !admin_email) {
      return res.status(400).json({
        success: false,
        error: 'title, message, type, scope, and admin_email are required'
      });
    }

    if (!VALID_MESSAGE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid message type. Allowed: ${VALID_MESSAGE_TYPES.join(', ')}`
      });
    }

    if (!VALID_SCOPES.includes(scope)) {
      return res.status(400).json({
        success: false,
        error: `Invalid scope. Allowed: ${VALID_SCOPES.join(', ')}`
      });
    }

    // Verify admin role
    const admin = await getAdminByEmail(pool, admin_email);
    if (!admin || (admin.role !== 'SuperAdmin' && admin.role !== 'Editor')) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    const input: CreateBroadcastInput = {
      title: title.trim(),
      message: message.trim(),
      type,
      scope,
      target_city: scope === 'city' ? (target_city || null) : null,
      target_event_id: scope === 'event' ? (target_event_id || null) : null,
      target_category: scope === 'category' ? (target_category || null) : null,
      sender_email: admin_email,
      sender_role: 'admin',
      link: link || null,
      metadata: metadata || {}
    };

    const result = await createBroadcastAndDispatch(pool, input);

    // Trigger Instant FCM Topic Broadcast
    let fcmTopic = 'global';
    if (scope === 'city' && target_city) {
      fcmTopic = `city_${target_city}`;
    } else if (scope === 'event' && target_event_id) {
      fcmTopic = `event_${target_event_id}`;
    } else if (scope === 'category' && target_category) {
      fcmTopic = `cat_${target_category}`;
    }

    sendFcmTopicBroadcast({
      topic: fcmTopic,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link,
      metadata: {
        broadcast_id: result.broadcast.id,
        scope: input.scope,
        ...(input.metadata || {})
      }
    }).catch(err => console.error('[FCM Broadcast Error]:', err));

    return res.json({
      success: true,
      message: `Broadcast successfully sent to ${result.recipientCount} users.`,
      data: result
    });
  } catch (error: any) {
    console.error('Error sending admin broadcast:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/organizer/events/:id/in-app-broadcast
 */
export async function organizerSendEventBroadcastHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { title, message, type, organizer_email, metadata } = req.body;

    if (!id || !title || !message || !type || !organizer_email) {
      return res.status(400).json({
        success: false,
        error: 'eventId, title, message, type, and organizer_email are required'
      });
    }

    if (!VALID_MESSAGE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid message type. Allowed: ${VALID_MESSAGE_TYPES.join(', ')}`
      });
    }

    // Verify event ownership
    const event = await getEventById(pool, id as string);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (event.organizer_email !== organizer_email) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not the organizer of this event' });
    }

    const input: CreateBroadcastInput = {
      title: title.trim(),
      message: message.trim(),
      type,
      scope: 'event',
      target_event_id: id as string,
      sender_email: organizer_email,
      sender_role: 'organizer',
      link: `/event/${id}`,
      metadata: {
        ...(metadata || {}),
        event_title: event.title
      }
    };

    const result = await createBroadcastAndDispatch(pool, input);

    // Trigger Instant FCM Topic Broadcast to event attendees
    sendFcmTopicBroadcast({
      topic: `event_${id}`,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link,
      metadata: {
        broadcast_id: result.broadcast.id,
        event_id: id,
        event_title: event.title,
        ...(input.metadata || {})
      }
    }).catch(err => console.error('[FCM Organizer Broadcast Error]:', err));

    return res.json({
      success: true,
      message: `Broadcast sent to ${result.recipientCount} event attendees.`,
      data: result
    });
  } catch (error: any) {
    console.error('Error sending organizer broadcast:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/admin/broadcasts
 */
export async function getAdminBroadcastsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const broadcasts = await getBroadcastsHistory(pool, limit, offset);
    return res.json({ success: true, data: broadcasts });
  } catch (error: any) {
    console.error('Error fetching broadcasts:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/organizer/broadcasts
 */
export async function getOrganizerBroadcastsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { organizer_email } = req.query;
    if (!organizer_email || typeof organizer_email !== 'string') {
      return res.status(400).json({ success: false, error: 'organizer_email required' });
    }

    const broadcasts = await getOrganizerBroadcastsHistory(pool, organizer_email);
    return res.json({ success: true, data: broadcasts });
  } catch (error: any) {
    console.error('Error fetching organizer broadcasts:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/notifications
 */
export async function getUserNotificationsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { email, filter } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'email query param required' });
    }

    const filterVal = filter === 'unread' || filter === 'alerts' ? filter : 'all';
    const notifications = await getUserNotifications(pool, email, filterVal);
    const unreadCount = await getUserUnreadNotificationCount(pool, email);

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching user notifications:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/notifications/unread-count
 */
export async function getUserUnreadCountHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'email query param required' });
    }

    const unreadCount = await getUserUnreadNotificationCount(pool, email);
    return res.json({ success: true, count: unreadCount });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/notifications/mark-read
 */
export async function markNotificationReadHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { notificationId, email } = req.body;
    if (!notificationId || !email) {
      return res.status(400).json({ success: false, error: 'notificationId and email required' });
    }

    await markNotificationRead(pool, notificationId, email);
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/notifications/mark-all-read
 */
export async function markAllNotificationsReadHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email required' });
    }

    await markAllNotificationsRead(pool, email);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/notifications/fcm/register
 */
export async function registerFcmTokenHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { email, token, deviceInfo, city, categories, rsvpEventIds } = req.body;
    if (!email || !token) {
      return res.status(400).json({ success: false, error: 'email and token required' });
    }

    await upsertUserFcmToken(pool, email, token, deviceInfo);

    // Build audience topics list for this user
    const topics: string[] = ['global'];
    if (city && typeof city === 'string' && city.trim() !== '') {
      topics.push(`city_${city.trim()}`);
    }
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (cat && typeof cat === 'string') topics.push(`cat_${cat.trim()}`);
      }
    }
    if (Array.isArray(rsvpEventIds)) {
      for (const eid of rsvpEventIds) {
        if (eid && typeof eid === 'string') topics.push(`event_${eid.trim()}`);
      }
    }

    await subscribeTokensToTopics([token], topics);

    return res.json({ success: true, message: 'FCM token registered and subscribed', topics });
  } catch (error: any) {
    console.error('Error registering FCM token:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/notifications/fcm/subscribe-event
 */
export async function subscribeEventFcmHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { email, eventId } = req.body;
    if (!email || !eventId) {
      return res.status(400).json({ success: false, error: 'email and eventId required' });
    }

    const tokens = await getUserFcmTokens(pool, email);
    if (tokens.length > 0) {
      await subscribeTokensToTopics(tokens, [`event_${eventId}`]);
    }

    return res.json({ success: true, message: `Subscribed to event_${eventId}` });
  } catch (error: any) {
    console.error('Error subscribing event FCM:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/notifications/fcm/unregister
 */
export async function unregisterFcmTokenHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'token required' });
    }

    await deleteUserFcmToken(pool, token);
    return res.json({ success: true, message: 'FCM token deleted' });
  } catch (error: any) {
    console.error('Error unregistering FCM token:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}


import { Pool } from 'pg';
import { Resend } from 'resend';
import { config } from './config';
import { sendFcmTopicBroadcast, sanitizeTopicName } from './firebaseAdmin';

const resend = new Resend(config.RESEND_API_KEY);

export interface NotificationPayload {
  userEmail: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  metadata?: Record<string, any>;
}

export interface SuperAdminNotificationOptions {
  title: string;
  message: string;
  type: string;
  link?: string | null;
  metadata?: Record<string, any>;
  emailSubject?: string;
  emailHtml?: string;
}

export interface OrganizerNotificationOptions {
  organizerEmail: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  metadata?: Record<string, any>;
  emailSubject?: string;
  emailHtml?: string;
}

/**
 * Insert a single in-app notification for a user
 */
export async function createUserNotification(pool: Pool, payload: NotificationPayload): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO user_notifications (user_email, title, message, type, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        payload.userEmail.toLowerCase().trim(),
        payload.title,
        payload.message,
        payload.type,
        payload.link || null,
        JSON.stringify(payload.metadata || {}),
      ]
    );
  } catch (error: any) {
    console.error(`[Notifications] Failed to create in-app notification for ${payload.userEmail}:`, error.message);
  }
}

/**
 * Fetch all active SuperAdmin emails from the database
 */
export async function getSuperAdminEmails(pool: Pool): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ email: string }>(
      `SELECT DISTINCT email FROM admins 
       WHERE LOWER(role::text) = 'superadmin' 
         AND (status = 'approved' OR status IS NULL)`
    );
    const emails = rows.map((r) => r.email.trim()).filter(Boolean);
    if (emails.length > 0) return emails;
  } catch (error: any) {
    console.error('[Notifications] Failed to fetch superadmins from database:', error.message);
  }

  // Fallback if no SuperAdmin found in database
  const fallback = process.env.SUPERADMIN_EMAIL || 'agent.vibecheck@gmail.com';
  return [fallback];
}

/**
 * Notify all SuperAdmins via in-app notification, FCM topic push, and optional email
 */
export async function notifySuperAdmins(pool: Pool, options: SuperAdminNotificationOptions): Promise<void> {
  try {
    const adminEmails = await getSuperAdminEmails(pool);

    // 1. Dispatch In-App Notifications
    await Promise.allSettled(
      adminEmails.map((email) =>
        createUserNotification(pool, {
          userEmail: email,
          title: options.title,
          message: options.message,
          type: options.type,
          link: options.link,
          metadata: options.metadata,
        })
      )
    );

    // 2. Dispatch FCM Push to admin_alerts topic
    sendFcmTopicBroadcast({
      topic: 'admin_alerts',
      title: options.title,
      message: options.message,
      type: options.type,
      link: options.link,
      metadata: options.metadata,
    }).catch((err) => {
      console.warn('[Notifications] FCM admin broadcast error:', err.message);
    });

    // 3. Dispatch Email via Resend if configured
    if (
      config.RESEND_API_KEY &&
      config.RESEND_API_KEY !== 're_dummy_key_123' &&
      options.emailSubject &&
      options.emailHtml
    ) {
      for (const email of adminEmails) {
        resend.emails
          .send({
            from: 'VibeCheck Notifications <onboarding@resend.dev>',
            to: email,
            subject: options.emailSubject,
            html: options.emailHtml,
          })
          .then((res) => {
            console.log(`[Notifications] Admin alert email dispatched to ${email}:`, res);
          })
          .catch((err) => {
            console.warn(`[Notifications] Failed to send email to superadmin ${email}:`, err.message);
          });
      }
    }
  } catch (error: any) {
    console.error('[Notifications] Unexpected error in notifySuperAdmins:', error.message);
  }
}

/**
 * Notify an organizer via in-app notification, FCM topic push, and optional email
 */
export async function notifyOrganizer(pool: Pool, options: OrganizerNotificationOptions): Promise<void> {
  if (!options.organizerEmail) return;

  try {
    const email = options.organizerEmail.toLowerCase().trim();

    // 1. Dispatch In-App Notification
    await createUserNotification(pool, {
      userEmail: email,
      title: options.title,
      message: options.message,
      type: options.type,
      link: options.link,
      metadata: options.metadata,
    });

    // 2. Dispatch FCM Push to user-specific topic
    sendFcmTopicBroadcast({
      topic: `user_${sanitizeTopicName(email)}`,
      title: options.title,
      message: options.message,
      type: options.type,
      link: options.link,
      metadata: options.metadata,
    }).catch((err) => {
      console.warn(`[Notifications] FCM push error for organizer ${email}:`, err.message);
    });

    // 3. Dispatch Email via Resend if configured
    if (
      config.RESEND_API_KEY &&
      config.RESEND_API_KEY !== 're_dummy_key_123' &&
      options.emailSubject &&
      options.emailHtml
    ) {
      resend.emails
        .send({
          from: 'VibeCheck <onboarding@resend.dev>',
          to: email,
          subject: options.emailSubject,
          html: options.emailHtml,
        })
        .then((res) => {
          console.log(`[Notifications] Organizer notification email dispatched to ${email}:`, res);
        })
        .catch((err) => {
          console.warn(`[Notifications] Failed to send email to organizer ${email}:`, err.message);
        });
    }
  } catch (error: any) {
    console.error(`[Notifications] Unexpected error in notifyOrganizer for ${options.organizerEmail}:`, error.message);
  }
}

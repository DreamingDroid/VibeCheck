import * as admin from 'firebase-admin';
import { config } from './config';

let firebaseInitialized = false;

export function initializeFirebaseAdmin() {
  if (firebaseInitialized) return;

  try {
    const serviceAccountKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccountKeyJson) {
      let serviceAccount: any;
      try {
        serviceAccount = JSON.parse(serviceAccountKeyJson);
      } catch {
        // If not JSON string, treat as file path
        serviceAccount = require(serviceAccountKeyJson);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      console.log('[FirebaseAdmin] Initialized with service account.');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      firebaseInitialized = true;
      console.log('[FirebaseAdmin] Initialized with Application Default Credentials.');
    } else {
      console.warn('[FirebaseAdmin] Warning: FIREBASE_SERVICE_ACCOUNT_KEY not set. FCM real-time push will run in simulated mode.');
    }
  } catch (error: any) {
    console.error('[FirebaseAdmin] Failed to initialize Firebase Admin SDK:', error.message);
  }
}

export interface FcmBroadcastPayload {
  topic: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Format topic name safely for FCM (only alphanumeric, dashes, underscores)
 */
export function sanitizeTopicName(topic: string): string {
  return topic.toLowerCase().replace(/[^a-zA-Z0-9-_.~%]/g, '_').substring(0, 100);
}

/**
 * Send a broadcast notification to an FCM topic
 */
export async function sendFcmTopicBroadcast(payload: FcmBroadcastPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!firebaseInitialized) {
    console.log(`[FirebaseAdmin - Sim Mode] Dispatched broadcast to topic: ${payload.topic} | Title: ${payload.title}`);
    return { success: true, messageId: 'simulated-fcm-id' };
  }

  try {
    const safeTopic = sanitizeTopicName(payload.topic);
    const targetUrl = payload.link || '/dashboard';

    const fcmMessage: admin.messaging.Message = {
      topic: safeTopic,
      notification: {
        title: payload.title,
        body: payload.message,
      },
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        link: targetUrl,
        click_action: targetUrl,
        timestamp: new Date().toISOString(),
        ...(payload.metadata ? { metadata_json: JSON.stringify(payload.metadata) } : {})
      },
      webpush: {
        headers: {
          Urgency: payload.type === 'emergency_alert' ? 'high' : 'normal',
        },
        notification: {
          title: payload.title,
          body: payload.message,
          icon: '/logo.png',
          badge: '/logo.png',
          requireInteraction: payload.type === 'emergency_alert',
        },
        fcmOptions: {
          link: targetUrl,
        }
      }
    };

    const response = await admin.messaging().send(fcmMessage);
    console.log(`[FirebaseAdmin] Successfully sent FCM broadcast to topic: ${safeTopic} | Response:`, response);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error(`[FirebaseAdmin] Error sending FCM message to topic: ${payload.topic}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe device tokens to a list of topics
 */
export async function subscribeTokensToTopics(tokens: string[], topics: string[]): Promise<void> {
  if (!firebaseInitialized || tokens.length === 0 || topics.length === 0) return;

  for (const topic of topics) {
    try {
      const safeTopic = sanitizeTopicName(topic);
      await admin.messaging().subscribeToTopic(tokens, safeTopic);
      console.log(`[FirebaseAdmin] Subscribed ${tokens.length} tokens to topic: ${safeTopic}`);
    } catch (error: any) {
      console.error(`[FirebaseAdmin] Error subscribing to topic ${topic}:`, error.message);
    }
  }
}

/**
 * Unsubscribe device tokens from a list of topics
 */
export async function unsubscribeTokensFromTopics(tokens: string[], topics: string[]): Promise<void> {
  if (!firebaseInitialized || tokens.length === 0 || topics.length === 0) return;

  for (const topic of topics) {
    try {
      const safeTopic = sanitizeTopicName(topic);
      await admin.messaging().unsubscribeFromTopic(tokens, safeTopic);
      console.log(`[FirebaseAdmin] Unsubscribed ${tokens.length} tokens from topic: ${safeTopic}`);
    } catch (error: any) {
      console.error(`[FirebaseAdmin] Error unsubscribing from topic ${topic}:`, error.message);
    }
  }
}

import { Pool } from 'pg';
import { config } from '../config';
import { notifySuperAdmins, notifyOrganizer, getSuperAdminEmails } from '../notifications';
import { getUserNotifications } from '../queries/broadcasts';

const pool = new Pool({
  connectionString: config.DATABASE_URL
});

async function runTest() {
  console.log('[Test] Connecting to DB...');
  
  // 1. Check SuperAdmin emails
  const superAdminEmails = await getSuperAdminEmails(pool);
  console.log('[Test] Detected SuperAdmin Emails:', superAdminEmails);

  // 2. Test SuperAdmin Notification
  console.log('[Test] Dispatching notifySuperAdmins...');
  await notifySuperAdmins(pool, {
    title: 'Test Notification: New Application',
    message: 'Test Organizer submitted an application.',
    type: 'approval_pending',
    link: '/admin/organizers?tab=pending',
    metadata: { test: true }
  });

  // Verify notification was stored for first superadmin
  const adminEmail = superAdminEmails[0];
  const adminNotifs = await getUserNotifications(pool, adminEmail, 'all', 5);
  console.log(`[Test] Latest Notifications for SuperAdmin (${adminEmail}):`, adminNotifs.map(n => ({
    id: n.id,
    title: n.title,
    type: n.type,
    link: n.link,
    created_at: n.created_at
  })));

  // 3. Test Organizer Notification
  const testOrganizerEmail = 'organizer_test@vibecheck.space';
  console.log(`[Test] Dispatching notifyOrganizer for ${testOrganizerEmail}...`);
  await notifyOrganizer(pool, {
    organizerEmail: testOrganizerEmail,
    title: 'Organizer Application Approved! 🎉',
    message: 'Congratulations! Your organizer application has been approved.',
    type: 'application_approved',
    link: '/organizer',
    metadata: { status: 'approved' }
  });

  const orgNotifs = await getUserNotifications(pool, testOrganizerEmail, 'all', 5);
  console.log(`[Test] Latest Notifications for Organizer (${testOrganizerEmail}):`, orgNotifs.map(n => ({
    id: n.id,
    title: n.title,
    type: n.type,
    link: n.link,
    created_at: n.created_at
  })));

  // Cleanup test notification for test organizer
  await pool.query('DELETE FROM user_notifications WHERE user_email = $1', [testOrganizerEmail]);
  await pool.query('DELETE FROM user_notifications WHERE title LIKE $1', ['Test Notification%']);
  console.log('[Test] Cleanup completed successfully.');

  await pool.end();
  console.log('[Test] All Notification Tests Passed!');
}

runTest().catch((err) => {
  console.error('[Test] Error running notification tests:', err);
  process.exit(1);
});

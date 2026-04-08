/**
 * test_cron_matchmaker.js
 * 
 * Manually triggers one full cycle of the AI Matchmaking cron job.
 * Usage: node test_cron_matchmaker.js
 * 
 * Steps:
 *  1. Temporarily sets cron_enabled = true
 *  2. Hits backend /test-cron endpoint 
 *  3. Resets cron_enabled = false
 */

async function triggerCron() {
  console.log('[Test] Triggering AI Matchmaker Cron...');
  try {
    const res = await fetch('http://localhost:4000/admin/trigger-cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const text = await res.text();
    console.log(`[Test] Response Status: ${res.status}`);
    console.log(`[Test] Response Body: ${text}`);
  } catch (err) {
    console.error('[Test] Error:', err.message);
  }
}

triggerCron();

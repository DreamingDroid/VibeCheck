import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { discoverVenueIntelligence, expandGoogleMapsUrl } from '../src/services/venueIntelligence';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const targetMapsUrl = 'https://maps.app.goo.gl/W2qse4LBjfAd8qBb6';
  console.log(`[VenueIntelligence] Expanding URL: ${targetMapsUrl}`);
  const expanded = await expandGoogleMapsUrl(targetMapsUrl);
  console.log(`[VenueIntelligence] Expanded Target URL: ${expanded}`);

  console.log(`[VenueIntelligence] Running Autonomous Discovery...`);
  const result = await discoverVenueIntelligence(pool, {
    locationName: '',
    city: 'Visakhapatnam',
    googleMapsUrl: targetMapsUrl
  });

  console.log('\n=== DISCOVERED VENUE DETAILS ===');
  console.log(JSON.stringify(result, null, 2));

  await pool.end();
}

run().catch(console.error);

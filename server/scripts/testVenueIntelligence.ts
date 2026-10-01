import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { discoverVenueIntelligence } from '../src/services/venueIntelligence';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('=== Test 1: Convention Center (Gadiraju Palace) ===');
  const result1 = await discoverVenueIntelligence(pool, {
    locationName: 'Gadiraju Palace Convention Center & Hotel',
    city: 'Visakhapatnam',
    googleMapsUrl: 'https://maps.app.goo.gl/YEFffuezS63zr8sB8'
  });
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n=== Test 2: Local Cafe (Pastry Coffee n Conversation) ===');
  const result2 = await discoverVenueIntelligence(pool, {
    locationName: 'Pastry Coffee n\' Conversation',
    city: 'Visakhapatnam',
    googleMapsUrl: 'https://maps.app.goo.gl/tkTUgPpAgFipzeLJ6'
  });
  console.log(JSON.stringify(result2, null, 2));

  await pool.end();
}

main().catch(console.error);

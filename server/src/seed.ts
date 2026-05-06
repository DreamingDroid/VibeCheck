import { Pool } from 'pg';
import { registerType } from 'pgvector/pg';
import { config } from './config';
import sampleEvents from './mock-data-for-testing.json';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

function generateRandomEmbedding(dim = 1024): string {
  const arr = new Array<string>(dim);
  for (let i = 0; i < dim; i++) {
    arr[i] = Math.random().toString();
  }
  return `[${arr.join(',')}]`;
}

async function main() {
  console.log('Using DATABASE_URL:', config.DATABASE_URL);
  const client = await pool.connect();
    try {
      await registerType(client);
  

    for (const ev of sampleEvents) {
      const embedding = generateRandomEmbedding();

      const insertEventQuery = `
        INSERT INTO events (title, description, location, city, date_time, category, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
        RETURNING id;
      `;

      const { rows } = await client.query(insertEventQuery, [
        ev.title,
        ev.description,
        ev.location,
        ev.city,
        ev.date_time,
        ev.category,
        embedding,
      ]);

      const eventId = rows[0].id as string;

      console.log(`Seeded event ${eventId}: ${ev.title}`);
    }

    console.log('Seeding complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});


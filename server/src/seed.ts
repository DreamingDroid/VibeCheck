import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { registerType } from 'pgvector/pg';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://lead_arch:password123@localhost:5433/vibecheck_db',
});

function generateRandomEmbedding(dim = 1024): string {
  const arr = new Array<string>(dim);
  for (let i = 0; i < dim; i++) {
    arr[i] = Math.random().toString();
  }
  return `[${arr.join(',')}]`;
}

async function main() {
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
  const client = await pool.connect();
  try {
    await registerType(client);

    const sampleEvents = [
      {
        title: 'Sunset Techno at Rushikonda',
        description:
          'Open-air techno party by the beach with local and guest DJs, featuring deep and melodic techno into the night in Vizag.',
        location: 'Rushikonda Beach, Vizag',
        date_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
        category: 'Techno',
      },
      {
        title: 'Indie Night at Harbour Brew',
        description:
          'Live indie and acoustic sets from up-and-coming bands, cozy vibes with craft beer and cocktails in Vizag.',
        location: 'Harbour Brew, Vizag',
        date_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
        category: 'Indie',
      },
      {
        title: 'Morning Yoga & Sound Bath',
        description:
          'Guided sunrise yoga session followed by a crystal bowl sound bath overlooking Vizag, perfect for a mindful reset.',
        location: 'Kailasagiri Hilltop, Vizag',
        date_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        category: 'Wellness',
      },
    ];

    for (const ev of sampleEvents) {
      const embedding = generateRandomEmbedding();

      const insertEventQuery = `
        INSERT INTO events (title, description, location, date_time, category, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
        RETURNING id;
      `;

      const { rows } = await client.query(insertEventQuery, [
        ev.title,
        ev.description,
        ev.location,
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


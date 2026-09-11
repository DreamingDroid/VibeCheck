import { Pool } from 'pg';
import { registerType } from 'pgvector/pg';
import { config } from './config';

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

const sampleEvents = [
  {
    title: 'Neon Garden: Melodic Techno',
    description: 'An immersive botanical techno experience with deep melodic beats and custom light installations.',
    location: 'The Glass House, Bangalore',
    city: 'Bangalore',
    date_time: '2026-06-10T20:00:00Z',
    category: 'Techno',
  },
  {
    title: 'Sunset Rooftop Yoga',
    description: 'Find your zen with a 60-minute Vinyasa flow followed by fresh organic juices and networking.',
    location: 'Sky Deck, Vizag',
    city: 'Vizag',
    date_time: '2026-06-11T17:30:00Z',
    category: 'Wellness',
  },
  {
    title: 'Indie Vibes Night',
    description: "Discover the city's best emerging indie bands in an intimate warehouse setting.",
    location: 'Warehouse 42, London',
    city: 'London',
    date_time: '2026-06-12T21:00:00Z',
    category: 'Indie',
  },
  {
    title: 'Abstract Painting Workshop',
    description: 'Learn the basics of abstract expressionism with local artists. All materials provided.',
    location: 'Art Collective, Bangalore',
    city: 'Bangalore',
    date_time: '2026-06-13T10:00:00Z',
    category: 'Workshop',
  },
];

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


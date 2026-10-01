import { Pool } from 'pg';
import { config } from '../src/config';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

const events = [
  {
    title: 'Sunrise Summit: Skandagiri Night Trek & Stargazing',
    description: 'Experience a thrilling midnight trek under the stars, reaching the summit just in time for an unforgettable sunrise over a blanket of clouds.',
    category: 'Adventure',
    location: 'Araku Hilltop Basecamp, Vizag',
    city: 'Vizag',
    date_time: '2026-10-05T04:30:00Z',
    end_time: '2026-10-05T10:00:00Z',
    is_featured: true,
    is_paid: false,
    ticket_price: 0,
    participant_limit: 30,
    status: 'approved',
    organizer_email: 'adventure@vibecheckspace.com'
  },
  {
    title: 'Sunset Acoustic Sessions & Vinyl Listening Lounge',
    description: 'Unwind with live unplugged guitar melodies, rare vinyl soul records, and craft beverages as the golden hour settles over the coast.',
    category: 'Music',
    location: 'The Beachfront Patio, RK Beach, Vizag',
    city: 'Vizag',
    date_time: '2026-10-06T18:00:00Z',
    end_time: '2026-10-06T22:00:00Z',
    is_featured: true,
    is_paid: true,
    ticket_price: 499,
    participant_limit: 60,
    status: 'approved',
    organizer_email: 'music@vibecheckspace.com'
  },
  {
    title: 'Coastal Sunrise 10K Run & Beach HIIT Sprint',
    description: 'Join fellow running enthusiasts for a scenic 10K coastal marathon followed by guided beach HIIT and recovery electrolyte smoothies.',
    category: 'Sports',
    location: 'Rushikonda Coastal Promenade, Vizag',
    city: 'Vizag',
    date_time: '2026-10-07T06:00:00Z',
    end_time: '2026-10-07T09:00:00Z',
    is_featured: true,
    is_paid: false,
    ticket_price: 0,
    participant_limit: 100,
    status: 'approved',
    organizer_email: 'sports@vibecheckspace.com'
  },
  {
    title: 'Midnight Horizon: Rooftop Neon Lounge & DJ Sets',
    description: 'An electric rooftop night with deep atmospheric house beats, handcrafted botanical cocktails, and panoramic ocean bay views.',
    category: 'Nightlife',
    location: 'Skyline Lounge & Bar, Siripuram, Vizag',
    city: 'Vizag',
    date_time: '2026-10-08T21:00:00Z',
    end_time: '2026-10-09T02:00:00Z',
    is_featured: true,
    is_paid: true,
    ticket_price: 999,
    participant_limit: 80,
    status: 'approved',
    organizer_email: 'nightlife@vibecheckspace.com'
  },
  {
    title: 'Boho Pottery & Ceramic Glazing Workshop',
    description: 'Get your hands clay-covered and sculpt your own bohemian terracotta pottery piece with guidance from master ceramic artisans.',
    category: 'Arts & Culture',
    location: 'Artisans Guild Studio, Waltair Uplands, Vizag',
    city: 'Vizag',
    date_time: '2026-10-09T15:00:00Z',
    end_time: '2026-10-09T18:00:00Z',
    is_featured: true,
    is_paid: true,
    ticket_price: 650,
    participant_limit: 25,
    status: 'approved',
    organizer_email: 'arts@vibecheckspace.com'
  },
  {
    title: 'Artisan Wine & Cheese Tasting Evening',
    description: 'Savor curated vintage wine pairings alongside artisanal cheese boards and farm-to-table small plates in a cozy garden setting.',
    category: 'Food & Drink',
    location: "The Olive & Vine Bistro, Lawson's Bay, Vizag",
    city: 'Vizag',
    date_time: '2026-10-10T19:00:00Z',
    end_time: '2026-10-10T22:30:00Z',
    is_featured: true,
    is_paid: true,
    ticket_price: 1200,
    participant_limit: 40,
    status: 'approved',
    organizer_email: 'food@vibecheckspace.com'
  },
  {
    title: 'Sound Bath Meditation & Ocean Flow Yoga',
    description: 'Recharge your mind and body with Tibetan singing bowl sound healing, gentle Vinyasa yoga, and soothing herbal tea therapy.',
    category: 'Wellness',
    location: 'Serenity Zen Pavilion, Bheemili Beach, Vizag',
    city: 'Vizag',
    date_time: '2026-10-11T07:00:00Z',
    end_time: '2026-10-11T09:30:00Z',
    is_featured: true,
    is_paid: false,
    ticket_price: 0,
    participant_limit: 35,
    status: 'approved',
    organizer_email: 'wellness@vibecheckspace.com'
  },
  {
    title: 'Creative Storytelling & Mobile Video Masterclass',
    description: 'Master the craft of cinematic visual storytelling, mobile cinematography, color grading, and editing in this hands-on creator workshop.',
    category: 'Workshops',
    location: 'The Creator Hub, MVP Colony, Vizag',
    city: 'Vizag',
    date_time: '2026-10-12T11:00:00Z',
    end_time: '2026-10-12T16:00:00Z',
    is_featured: true,
    is_paid: true,
    ticket_price: 799,
    participant_limit: 30,
    status: 'approved',
    organizer_email: 'workshops@vibecheckspace.com'
  },
  {
    title: 'Sacred Chanting, Kirtan & Full Moon Satsang',
    description: 'An evening of heart-opening devotional kirtan music, sacred mantras, breathwork, and communal reflection under the moonlight.',
    category: 'Spiritual',
    location: 'Prana Sanctuary, Kailasagiri Hills, Vizag',
    city: 'Vizag',
    date_time: '2026-10-13T18:30:00Z',
    end_time: '2026-10-13T21:30:00Z',
    is_featured: true,
    is_paid: false,
    ticket_price: 0,
    participant_limit: 50,
    status: 'approved',
    organizer_email: 'spiritual@vibecheckspace.com'
  },
  {
    title: 'Laugh Out Loud: Beachside Standup Comedy Showcase',
    description: 'A hilarious night of unscripted standup comedy and storytelling featuring the sharpest touring comics and local improvisers.',
    category: 'Comedy',
    location: 'The Comedy Attic, Daspalla Hills, Vizag',
    city: 'Vizag',
    date_time: '2026-10-14T20:00:00Z',
    end_time: '2026-10-14T22:30:00Z',
    is_featured: true,
    is_paid: true,
    ticket_price: 399,
    participant_limit: 75,
    status: 'approved',
    organizer_email: 'comedy@vibecheckspace.com'
  },
  {
    title: 'Cyber Synth: Underground Modular Techno Experience',
    description: 'Submerge into hypnotic analog modular synth rhythms, reactive projection mapping, and deep sub-bass frequencies.',
    category: 'Techno',
    location: 'The Vault Underground, Gajuwaka Warehouse, Vizag',
    city: 'Vizag',
    date_time: '2026-10-15T22:00:00Z',
    end_time: '2026-10-16T04:00:00Z',
    is_featured: true,
    is_paid: true,
    ticket_price: 850,
    participant_limit: 90,
    status: 'approved',
    organizer_email: 'techno@vibecheckspace.com'
  },
  {
    title: 'Indie Folk Echoes: Warehouse Showcase & Zine Fair',
    description: 'An intimate showcase of indie acoustic songwriters, handmade zines, vintage film photography popups, and warm community vibes.',
    category: 'Indie',
    location: 'Old Town Warehouse Studio, Vizag',
    city: 'Vizag',
    date_time: '2026-10-16T17:00:00Z',
    end_time: '2026-10-16T21:00:00Z',
    is_featured: true,
    is_paid: true,
    ticket_price: 350,
    participant_limit: 50,
    status: 'approved',
    organizer_email: 'indie@vibecheckspace.com'
  },
  {
    title: 'VibeCheck Community Social & Indie Pop-Up Market',
    description: 'Meet local creators, explore curated indie fashion and artisanal coffee stalls, and connect with the creative community.',
    category: 'General',
    location: 'Central Promenade Square, Vizag',
    city: 'Vizag',
    date_time: '2026-10-17T16:00:00Z',
    end_time: '2026-10-17T21:00:00Z',
    is_featured: true,
    is_paid: false,
    ticket_price: 0,
    participant_limit: 120,
    status: 'approved',
    organizer_email: 'general@vibecheckspace.com'
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const ev of events) {
      const existing = await client.query('SELECT id FROM events WHERE title = $1', [ev.title]);
      if (existing.rows.length === 0) {
        const res = await client.query(
          `INSERT INTO events (
            title, description, category, location, city, date_time, end_time,
            is_featured, is_paid, ticket_price, participant_limit, status, organizer_email
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id, title, category;`,
          [
            ev.title,
            ev.description,
            ev.category,
            ev.location,
            ev.city,
            ev.date_time,
            ev.end_time,
            ev.is_featured,
            ev.is_paid,
            ev.ticket_price,
            ev.participant_limit,
            ev.status,
            ev.organizer_email
          ]
        );
        console.log(`✓ Inserted: [${res.rows[0].category}] ${res.rows[0].title}`);
      } else {
        console.log(`- Exists: [${ev.category}] ${ev.title}`);
      }
    }
    console.log('🎉 Successfully seeded dummy events for all categories!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

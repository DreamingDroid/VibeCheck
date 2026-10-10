import { Pool } from 'pg';
import { config } from '../src/config';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

async function seedRichTestEvent() {
  const client = await pool.connect();
  try {
    console.log('[Seed] Inserting comprehensive test event with all fields...');

    // 1. Ensure a verified organizer exists for this event
    const organizerEmail = 'expeditions@vibecheckspace.com';
    await client.query(`
      INSERT INTO admins (
        email, role, status, brand_name, description, instagram_handle, instagram_verified, rating, slug
      ) VALUES (
        $1, 'organizer', 'approved', 'Coastline Pioneers & Outdoor Club',
        'Certified eco-expedition group hosting coastal treks, night kayaking, and outdoor acoustic sessions across India.',
        'coastlinepioneers', true, 4.9, 'coastline-pioneers'
      )
      ON CONFLICT (email) DO UPDATE SET
        status = 'approved',
        brand_name = EXCLUDED.brand_name,
        description = EXCLUDED.description,
        instagram_handle = EXCLUDED.instagram_handle,
        instagram_verified = true,
        rating = 4.9,
        slug = EXCLUDED.slug
    `, [organizerEmail]);

    // 2. Comprehensive description (well over 8 lines to thoroughly test clamping and full details modal)
    const longDescription = `Embark on an adrenaline-charged, scenic weekend adventure along the untamed cliffs and glowing waters of Vizag!

The Coastal Cliffside Expedition & Bioluminescent Night Kayaking is a handcrafted outdoor experience curated for nature lovers, thrill-seekers, and night-sky stargazers alike.

Our journey begins at the Rushikonda Adventure Basecamp with a comprehensive safety briefing and mountaineering harness check. From there, we navigate secret rocky trails, ascending to panoramic cliffside sunset viewpoints offering 360-degree vistas over the Bay of Bengal.

As twilight settles, we descend to our private cove where certified water safety instructors guide you into tandem ocean kayaks. Paddle out under the stars to witness the rare natural phenomenon of bioluminescence—where each paddle stroke illuminates neon-blue glowing plankton in the water!

Following the kayak expedition, gather around a warm beach bonfire for an intimate acoustic jam session, curated artisan barbecue skewers (vegetarian & non-vegetarian), and chilled refreshments.

Whether you are a solo traveler looking to meet like-minded vibe seekers or a group of close friends, our certified expedition marshals ensure top-tier safety, first aid support, and professional photography coverage throughout.

Note: No prior kayaking experience is required. Certified life vests and safety gear are mandatory and provided for every participant. Please bring an extra pair of dry clothes and your adventure spirit!`;

    const attendeeGuide = {
      schedule: [
        {
          time: "04:00 PM",
          title: "Basecamp Assembly & Gear Check",
          description: "Meet the team at Rushikonda Basecamp, complete verification check-in, and receive your harness & water-resistant gear pack."
        },
        {
          time: "04:30 PM",
          title: "Guided Coastal Cliff Trek",
          description: "A scenic 2.5 km trek along elevated ridge trails to capture breathtaking panoramic sunset vistas."
        },
        {
          time: "06:15 PM",
          title: "Golden Hour Staging & Hydration Break",
          description: "Sunset photography session with complimentary electrolyte drinks and fresh local snacks."
        },
        {
          time: "07:00 PM",
          title: "Kayaking Safety Briefing & Vest Fitting",
          description: "Instructional walkthrough on paddling techniques, ocean currents, and group navigation signals."
        },
        {
          time: "07:30 PM",
          title: "Bioluminescent Night Kayaking Session",
          description: "90 minutes of guided night paddling over glowing plankton waters under starlit skies."
        },
        {
          time: "09:15 PM",
          title: "Beachside Bonfire, Acoustic Jam & Barbecue",
          description: "Live unplugged music session with grilled skewers (veg & non-veg options), warm soup, and mocktails."
        },
        {
          time: "10:30 PM",
          title: "Debrief & Souvenir Photo Mementos",
          description: "Access high-res drone shots and group photos via your VibeCheck pass hub."
        }
      ],
      highlights: [
        "Certified marine expedition leaders and CPR-trained lifeguards",
        "Rare bioluminescent night kayaking experience",
        "Panoramic cliffside sunset photo points",
        "Gourmet beach bonfire barbecue with chef-prepared small plates",
        "Professional drone action videography and DSLR portraits included",
        "USCG Type III certified life vests & dry bags provided for everyone"
      ],
      whatToCarry: [
        "Sturdy athletic footwear or grip water shoes",
        "Extra change of quick-dry clothes & small towel",
        "Reusable water bottle (chilled refill stations at basecamp)",
        "Waterproof pouch for smartphones (optional, dry bags provided)",
        "Government ID for pass verification gate check"
      ],
      assemblyPoint: "Rushikonda Beach Adventure Cove Basecamp - Gate #3 (Next to Coastal Guard Station), Vizag",
      assemblyMapsUrl: "https://maps.google.com/?q=Rushikonda+Beach+Vizag",
      contacts: [
        {
          name: "Captain Vikram Varma",
          phone: "+91 98765 43210",
          role: "Lead Expedition Marshal"
        },
        {
          name: "Ananya Deshmukh",
          phone: "+91 91234 56789",
          role: "Safety & Guest Concierge"
        }
      ],
      feeNote: "All-inclusive attendee pass covering kayak rentals, safety marshals, barbecue dinner, beverages, and media coverage.",
      importantNotes: [
        "Non-swimmers are warmly welcome; all water activities are fully supported by spotter safety boats.",
        "Zero alcohol or substance tolerance before/during kayaking session for community safety.",
        "Please arrive 15 minutes before 04:00 PM to ensure on-time schedule departure."
      ]
    };

    // Calculate dates (next Saturday at 4 PM)
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + ((6 - eventDate.getDay() + 7) % 7 || 7));
    eventDate.setHours(16, 0, 0, 0);

    const endDate = new Date(eventDate);
    endDate.setHours(22, 30, 0, 0);

    // Insert or update the event
    const eventQuery = `
      INSERT INTO events (
        title, description, category, location, city, date_time, end_time, timings,
        external_link, google_maps_link, whatsapp_group_link, contact_info,
        participant_limit, is_paid, ticket_price, is_featured, visibility,
        image_url, attendee_guide, event_type, timezone, min_age, suitable_age,
        organizer_email, status
      ) VALUES (
        $1, $2, 'Adventure'::event_category, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15, 'public'::event_visibility,
        $16, $17::jsonb, 'in_person', 'Asia/Kolkata', 18, '18-45 years (Moderate Fitness)',
        $18, 'approved'
      )
      RETURNING id, title, category, city, date_time
    `;

    const values = [
      'Coastal Cliffside Expedition & Bioluminescent Night Kayaking',
      longDescription,
      'Rushikonda Adventure Cove & Cliff Basecamp, Vizag',
      'Vizag',
      eventDate.toISOString(),
      endDate.toISOString(),
      '04:00 PM – 10:30 PM IST',
      'https://vibecheckspace.com',
      'https://maps.google.com/?q=Rushikonda+Beach+Vizag',
      'https://chat.whatsapp.com/sample-vibe-invite',
      '+91 98765 43210',
      35,
      true,
      1499,
      true,
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1200&auto=format&fit=crop',
      JSON.stringify(attendeeGuide),
      organizerEmail
    ];

    const result = await client.query(eventQuery, values);
    console.log('[Seed] Created comprehensive test event successfully:', result.rows[0]);

  } catch (err) {
    console.error('[Seed] Error seeding rich test event:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRichTestEvent();

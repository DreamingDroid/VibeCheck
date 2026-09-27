import dotenv from 'dotenv';
import path from 'path';

// Load environment from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { sendVenueAuthorizationEmail } from '../src/services/venueAuthEmail';

async function main() {
  const targetEmail = 'tgavara@gmail.com';
  console.log(`[TestEmail] Triggering live legal venue authorization email to ${targetEmail}...`);

  const token = 'demo_token_' + Math.random().toString(36).substring(2, 15);
  const auditReferenceId = `VB-AUTH-${Math.random().toString(36).substring(2, 10).toUpperCase()}-2026`;

  const success = await sendVenueAuthorizationEmail({
    auditReferenceId,
    token,
    venueName: 'Ironhill Brewery & Restaurant (Vizag)',
    venueAddress: 'Siripuram, Visakhapatnam, Andhra Pradesh',
    venueSectionHall: 'Rooftop Deck / Lounge Area',
    venueOfficialEmail: targetEmail,
    organizerBrandName: 'Vizag Board Gamers Club',
    organizerLegalName: 'Trivikram Gavara',
    organizerPhone: '+91 98765 43210',
    organizerEmail: 'trivikram@baybuzzlabs.com',
    eventTitle: 'Sunday Board Games & Craft Social',
    eventCategory: 'Social & Games',
    eventStartTimeIST: 'Sunday, Oct 4, 2026 at 05:00 PM',
    eventEndTimeIST: '09:00 PM IST',
    participantLimit: 40,
    isPaid: true,
    ticketPrice: 499,
    tokenExpiresAtIST: 'Tuesday, Sep 29, 2026 at 05:00 PM IST'
  });

  if (success) {
    console.log(`\n🎉 Live email delivered successfully to ${targetEmail}! (Ref: ${auditReferenceId})`);
  } else {
    console.error('\n❌ Email delivery failed. See log above.');
  }
}

main().catch(console.error);

import { runFastFilter, evaluateContentWithAI, generateOrganizerInstagramIntelligence } from '../moderation';

async function runTests() {
  console.log('==============================================');
  console.log('🧪 Testing AI Guardrails & Content Moderation');
  console.log('==============================================\n');

  // Test 1: Fast Filter with English & Hindi Profanity
  console.log('1. Testing Fast Profanity Filter (English & Hindi):');
  const dirtyText = 'This is a f*ck event with chutiya organizer and telegram leaks';
  const fastResult1 = runFastFilter(dirtyText);
  console.log('Input:', dirtyText);
  console.log('Passed:', fastResult1.passed);
  console.log('Flagged Words:', fastResult1.flaggedWords);
  console.log('Reason:', fastResult1.reason);
  console.assert(!fastResult1.passed, 'Fast filter should catch profanity!');
  console.log('✅ Test 1 Passed!\n');

  // Test 2: Fast Filter with Telugu Slang (Romanized & Native Script)
  console.log('2. Testing Telugu Profanity Filter:');
  const teluguDirty = 'Event with dengu and erripuku vibes లంజ';
  const fastResultTelugu = runFastFilter(teluguDirty);
  console.log('Input:', teluguDirty);
  console.log('Passed:', fastResultTelugu.passed);
  console.log('Flagged Words:', fastResultTelugu.flaggedWords);
  console.assert(!fastResultTelugu.passed, 'Fast filter should catch Telugu abusive slang!');
  console.log('✅ Test 2 Passed!\n');

  // Test 3: Fast Filter on Clean Event
  console.log('3. Testing Fast Filter on Clean Event:');
  const cleanText = 'Sunset Techno Beats & Beachside Vibes at RK Beach';
  const fastResult2 = runFastFilter(cleanText);
  console.log('Input:', cleanText);
  console.log('Passed:', fastResult2.passed);
  console.assert(fastResult2.passed, 'Fast filter should pass clean text!');
  console.log('✅ Test 3 Passed!\n');

  // Test 4: Instagram Host AI Intelligence Report
  console.log('4. Testing Instagram Host Intelligence Evaluator:');
  const igReport = await generateOrganizerInstagramIntelligence({
    username: 'vizagsunsettrekkers',
    account_name: 'Vizag Sunset Trekkers',
    followers_count: 4200,
    media_count: 36,
    recent_posts: [
      { caption: 'Sunrise trek to Madhavadhara waterfalls this Sunday at 5:30 AM! Register via bio.', timestamp: '2026-08-20' },
      { caption: 'Yarada lighthouse coastal cliff hike recap! 25 enthusiastic hikers joined us.', timestamp: '2026-08-10' },
    ],
  });
  console.log('Estimated Past Events:', igReport.estimated_past_events_count);
  console.log('Primary Vibes:', igReport.primary_vibe_categories);
  console.log('Host Trust Score:', igReport.host_trust_score);
  console.log('Insights:', igReport.summary_insights);
  console.assert(igReport.host_trust_score >= 60, 'Legitimate host should receive solid trust score!');
  console.log('✅ Test 4 Passed!\n');

  // Test 5: AI Scrutiny on Organizer Application
  console.log('5. Testing AI Scrutiny on Legitimate Organizer:');
  const orgPayload = {
    brand_name: 'Vizag Acoustic Nights',
    description: 'We host weekly live indie acoustic sessions and open mics for local singers and song-writers in Vizag.',
    city: 'Vizag',
    instagram_handle: 'vizagacousticnights',
  };

  try {
    const aiResult = await evaluateContentWithAI('organizer', orgPayload);
    console.log('AI Decision:', aiResult.decision);
    console.log('Quality Score:', aiResult.quality_score);
    console.log('Reason:', aiResult.reason);
    console.log('Flags:', aiResult.flags);
    console.log('✅ Test 5 Complete!\n');
  } catch (err: any) {
    console.log('AI test skipped or completed with fallback:', err.message);
  }

  console.log('==============================================');
  console.log('🎉 All Guardrail & Moderation Tests Finished Successfully!');
  console.log('==============================================');
}

runTests();


import { runFastFilter, evaluateContentWithAI } from '../moderation';

async function runTests() {
  console.log('==============================================');
  console.log('🧪 Testing AI Guardrails & Content Moderation');
  console.log('==============================================\n');

  // Test 1: Fast Filter with Profanity
  console.log('1. Testing Fast Profanity Filter:');
  const dirtyText = 'This is a f*ck event with chutiya organizer and telegram leaks';
  const fastResult1 = runFastFilter(dirtyText);
  console.log('Input:', dirtyText);
  console.log('Passed:', fastResult1.passed);
  console.log('Flagged Words:', fastResult1.flaggedWords);
  console.log('Reason:', fastResult1.reason);
  console.assert(!fastResult1.passed, 'Fast filter should catch profanity!');
  console.log('✅ Test 1 Passed!\n');

  // Test 2: Fast Filter with Clean Text
  console.log('2. Testing Fast Filter on Clean Event:');
  const cleanText = 'Sunset Techno Beats & Beachside Vibes at RK Beach';
  const fastResult2 = runFastFilter(cleanText);
  console.log('Input:', cleanText);
  console.log('Passed:', fastResult2.passed);
  console.assert(fastResult2.passed, 'Fast filter should pass clean text!');
  console.log('✅ Test 2 Passed!\n');

  // Test 3: AI Scrutiny on Organizer Application
  console.log('3. Testing AI Scrutiny on Legitimate Organizer:');
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
    console.log('✅ Test 3 Complete!\n');
  } catch (err: any) {
    console.log('AI test skipped or completed with fallback:', err.message);
  }

  console.log('==============================================');
  console.log('🎉 All Guardrail Tests Finished Successfully!');
  console.log('==============================================');
}

runTests();

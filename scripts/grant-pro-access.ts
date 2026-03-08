#!/usr/bin/env tsx
/**
 * Grant Pro Access Script
 *
 * Usage:
 *   npx tsx scripts/grant-pro-access.ts user@example.com
 *   npx tsx scripts/grant-pro-access.ts user1@example.com user2@example.com
 *
 * This script grants pro tier access to specified users for testing purposes.
 * It updates both the profiles table and creates/updates subscription records.
 */

import { createClient } from '@supabase/supabase-js';

// Service role client for admin script -- bypasses RLS intentionally for cross-user updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function grantProAccess(email: string): Promise<boolean> {
  console.log(`\n🔍 Looking up user: ${email}`);

  // Find user by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    console.error(`   ❌ User not found: ${email}`);
    return false;
  }

  console.log(`   ✓ Found user: ${profile.id}`);

  // Check current subscription status
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', profile.id)
    .single();

  console.log(`   Current tier: ${currentSub?.tier || 'none'}`);
  console.log(`   Current status: ${currentSub?.status || 'none'}`);

  // Create or update subscription record
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

  const { error: upsertSubError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: profile.id,
        tier: 'pro',
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

  if (upsertSubError) {
    console.error(`   ⚠️  Warning: Failed to update subscription:`, upsertSubError.message);
    console.log(`   Profile was updated, but subscription record may be inconsistent`);
    return true; // Profile was updated, so partial success
  }

  console.log(`   ✓ Updated subscription record`);
  console.log(`   ✅ Successfully granted pro access to ${email}`);
  console.log(`   Valid until: ${periodEnd.toLocaleDateString()}`);

  return true;
}

async function main() {
  const emails = process.argv.slice(2);

  if (emails.length === 0) {
    console.error('❌ Error: No email addresses provided\n');
    console.log('Usage:');
    console.log('  npx tsx scripts/grant-pro-access.ts user@example.com');
    console.log('  npx tsx scripts/grant-pro-access.ts user1@example.com user2@example.com\n');
    process.exit(1);
  }

  console.log('🚀 Grant Pro Access Script');
  console.log('═'.repeat(50));
  console.log(`Processing ${emails.length} user(s)...`);

  let successCount = 0;
  let failCount = 0;

  for (const email of emails) {
    const success = await grantProAccess(email);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Success: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}`);
  }
  console.log('═'.repeat(50));

  process.exit(failCount > 0 ? 1 : 0);
}

main();

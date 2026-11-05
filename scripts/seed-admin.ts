/**
 * Production Database Seeder & Admin Promotion Script
 *
 * Promotes a target user account to full Administrator status:
 * 1. Sets profiles.role = 'admin'
 * 2. Sets profiles.status = 'active'
 * 3. Grants unrestricted access to /admin/requests and client management.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts [admin_email]
 * Example:
 *   npx tsx scripts/seed-admin.ts admin@yourdomain.com
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../lib/supabase/admin';

async function seedAdmin() {
  const targetEmail = (
    process.argv[2] ||
    process.env.ADMIN_EMAIL ||
    'admin@coldreach.local'
  ).trim().toLowerCase();

  console.log('\n======================================================');
  console.log('🛡️ ColdReach CRM: Admin Role Provisioning');
  console.log('======================================================\n');
  console.log(`Target Admin Email: ${targetEmail}`);

  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch (err: unknown) {
    console.error('❌ Environment configuration error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // 1. Check if user profile already exists
  console.log('1. Querying profiles table for existing account...');
  const { data: existingProfile, error: queryError } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('email', targetEmail)
    .maybeSingle();

  if (queryError) {
    console.error('❌ Database query error:', queryError.message);
    if (queryError.message.includes('Invalid API key')) {
      console.log('\n💡 Tip: Please configure your production SUPABASE_SERVICE_ROLE_KEY in .env.local');
    }
    process.exit(1);
  }

  if (existingProfile) {
    console.log(`   Found existing user (ID: ${existingProfile.id}).`);
    console.log(`   Current Role: ${existingProfile.role} | Current Status: ${existingProfile.status}`);

    // Update to admin
    console.log('2. Promoting account to Role: "admin", Status: "active"...');
    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('profiles')
      .update({
        role: 'admin',
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProfile.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError.message);
      process.exit(1);
    }

    console.log('\n✅ SUCCESS: Administrator privileges granted!');
    console.table([
      {
        ID: updatedProfile.id,
        Email: updatedProfile.email,
        Name: updatedProfile.full_name || 'Admin',
        Role: updatedProfile.role,
        Status: updatedProfile.status,
      },
    ]);
  } else {
    console.log('   No existing profile found with that email.');
    console.log('2. Creating active Administrator profile record...');

    const newId = crypto.randomUUID();
    const { data: newAdmin, error: insertError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newId,
        email: targetEmail,
        full_name: 'Primary Administrator',
        role: 'admin',
        status: 'active',
        phone: '03001234567',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Could not create profile:', insertError.message);
      console.log('\n👉 Alternatively, sign up the user through the UI at /login, then re-run:');
      console.log(`   npx tsx scripts/seed-admin.ts ${targetEmail}\n`);
      process.exit(1);
    }

    console.log('\n✅ SUCCESS: Administrator profile created and activated!');
    console.table([
      {
        ID: newAdmin.id,
        Email: newAdmin.email,
        Name: newAdmin.full_name,
        Role: newAdmin.role,
        Status: newAdmin.status,
      },
    ]);
  }

  console.log('\nAccess the Admin Verification Panel at:');
  console.log('👉 http://localhost:3000/admin/requests (or your production Vercel URL)\n');
}

seedAdmin().catch((err) => {
  console.error('Fatal admin provisioning error:', err);
  process.exit(1);
});


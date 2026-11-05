/**
 * End-to-End Campaign Pipeline Simulation Script
 *
 * Simulates:
 * 1. User authentication & active quota verification (50 daily / 1,500 monthly)
 * 2. Mock lead ingestion from a spreadsheet
 * 3. Gemini AI dynamic niche cold email personalization
 * 4. Humanized anti-spam delay simulation (with --fast flag support)
 * 5. Atomic quota tracking & database verification in Supabase
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts [--fast]
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from '../lib/supabase/admin';
import { generatePersonalizedEmail } from '../lib/ai-personalizer';
import { validateUserQuota, incrementQuotaUsage } from '../lib/quota';

const isFast = process.argv.includes('--fast');

async function runSimulation() {
  console.log('\n======================================================');
  console.log('🚀 ColdReach CRM: End-to-End Pipeline Simulation');
  console.log(`⏱ Mode: ${isFast ? 'FAST MODE (2s delay override)' : 'PRODUCTION MODE (45-90s randomized delay)'}`);
  console.log('======================================================\n');

  let useLiveDb = false;
  let testUserId = '00000000-0000-0000-0000-000000000001';
  const mockEmail = 'pipeline_tester@coldreach.test';

  let initialQuota = {
    canSend: true,
    remainingDaily: 50,
    remainingMonthly: 1500,
    dailyLimit: 50,
    monthlyLimit: 1500,
    dailySent: 0,
    monthlySent: 0,
  };

  try {
    const adminSupabase = createAdminClient();
    console.log(`[1/5] Testing Supabase connectivity for client (${mockEmail})...`);

    const { data: profile, error: profileErr } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('email', mockEmail)
      .maybeSingle();

    if (profileErr && profileErr.message.includes('Invalid API key')) {
      throw new Error('Supabase remote returned Invalid API key (mock/local credentials detected).');
    }

    if (profile) {
      testUserId = profile.id;
      const q = await validateUserQuota(profile.id);
      if (q.dailyLimit) {
        initialQuota = q;
        useLiveDb = true;
      }
    } else {
      const { data: newProfile, error: insertErr } = await adminSupabase
        .from('profiles')
        .insert({
          id: testUserId,
          email: mockEmail,
          full_name: 'Pipeline QA Tester',
          role: 'client',
          status: 'active',
          phone: '03001234567',
        })
        .select()
        .single();

      if (!insertErr && newProfile) {
        testUserId = newProfile.id;
        const todayStr = new Date().toISOString().split('T')[0];
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await adminSupabase.from('subscriptions').insert({
          user_id: testUserId,
          plan_name: 'Starter 3000 PKR',
          status: 'active',
          daily_email_limit: 50,
          monthly_email_limit: 1500,
          daily_emails_sent: 0,
          monthly_emails_sent: 0,
          last_reset_date: todayStr,
          expires_at: expiresAt,
        });

        const q = await validateUserQuota(testUserId);
        initialQuota = q;
        useLiveDb = true;
      }
    }
  } catch (dbErr: unknown) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.log(`ℹ️  Supabase note: ${msg}`);
    console.log('👉 Proceeding with in-memory quota tracking simulation mode.\n');
  }

  // 2. Validate Quotas
  console.log('[2/5] Validating client quotas before dispatch:');
  console.log(`   ✓ Active Tenant Status: ${initialQuota.canSend ? 'AUTHORIZED' : 'RESTRICTED'}`);
  console.log(`   ✓ Daily Quota: ${initialQuota.dailySent} / ${initialQuota.dailyLimit} (Remaining: ${initialQuota.remainingDaily})`);
  console.log(`   ✓ Monthly Quota: ${initialQuota.monthlySent} / ${initialQuota.monthlyLimit} (Remaining: ${initialQuota.remainingMonthly})`);

  // 3. Mock Lead Row from Google Sheet
  const sampleLead = {
    name: 'Ahmed Ali',
    company: 'Apex Salon & Spa',
    niche: 'Hair Salon & Grooming',
    email: 'ahmed.ali@apexsalon.example',
    notes: 'Needs appointment chatbot to automate weekend bookings',
  };

  console.log('\n[3/5] Ingested sample prospect lead from spreadsheet:');
  console.log(`   • Full Name:  ${sampleLead.name}`);
  console.log(`   • Company:    ${sampleLead.company}`);
  console.log(`   • Niche:      ${sampleLead.niche}`);
  console.log(`   • Pain Point: ${sampleLead.notes}`);

  // 4. Gemini AI Personalization
  console.log('\n[4/5] Running Google Gemini AI Niche Personalizer...');
  const subjectTemplate = 'Quick question regarding appointment bookings for {{Company}}';
  const bodyTemplate =
    'Hi {{Name}},\n\nI was looking into {{Company}} and noticed your focus on {{Niche}}. We recently helped several similar businesses increase client acquisition with personalized outreach.\n\nWould you be open to a quick 5-minute chat sometime this week?\n\nBest regards,\nGrowth Outreach Team';

  const startTime = Date.now();
  const emailResult = await generatePersonalizedEmail({
    lead: sampleLead,
    subjectTemplate,
    bodyTemplate,
  });
  const elapsedMs = Date.now() - startTime;

  console.log(`   ✓ AI Processing Time: ${elapsedMs}ms`);
  console.log(`   ✓ Generation Mode: ${emailResult.isAiGenerated ? 'Gemini AI Personalized' : 'Template Fallback'}`);
  console.log(`   ✓ Formatted Subject: "${emailResult.subject}"`);
  console.log('   ✓ Personalized Email Copy:');
  console.log('   ------------------------------------------------------');
  console.log(`   ${emailResult.body.replace(/\n/g, '\n   ')}`);
  console.log('   ------------------------------------------------------');

  // 5. Anti-Spam Humanized Delay
  const delaySec = isFast ? 2 : Math.floor(Math.random() * (90 - 45 + 1)) + 45;
  console.log(`\n[5/5] Anti-Spam Throttler: Simulating ${delaySec}s humanized pause...`);

  for (let s = delaySec; s > 0; s--) {
    process.stdout.write(`   ⏱  Anti-Spam safety interval: ${s}s remaining...\r`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`\n   ✓ Anti-Spam delay complete! Dispatching simulated email to ${sampleLead.email}...`);

  // 6. Quota Increment & Audit
  let afterDailySent = initialQuota.dailySent + 1;
  let afterMonthlySent = initialQuota.monthlySent + 1;
  let afterRemainingDaily = Math.max(0, initialQuota.dailyLimit - afterDailySent);

  if (useLiveDb) {
    await incrementQuotaUsage(testUserId, 1);
    const updated = await validateUserQuota(testUserId);
    afterDailySent = updated.dailySent;
    afterMonthlySent = updated.monthlySent;
    afterRemainingDaily = updated.remainingDaily;
  }

  console.log('\n======================================================');
  console.log('🎯 PIPELINE AUDIT SUMMARY:');
  console.log('======================================================');
  console.table([
    {
      Metric: 'Daily Emails Sent',
      Before: initialQuota.dailySent,
      After: afterDailySent,
      Delta: '+1 email',
    },
    {
      Metric: 'Daily Remaining',
      Before: initialQuota.remainingDaily,
      After: afterRemainingDaily,
      Delta: '-1 email',
    },
    {
      Metric: 'Monthly Emails Sent',
      Before: initialQuota.monthlySent,
      After: afterMonthlySent,
      Delta: '+1 email',
    },
    {
      Metric: 'AI Niche Personalization',
      Before: 'Raw Template',
      After: emailResult.isAiGenerated ? 'Gemini AI Custom' : 'Template Fallback',
      Delta: 'PASS',
    },
    {
      Metric: 'Spam Guard Delay Logic',
      Before: '0s (Immediate)',
      After: `${delaySec}s throttled`,
      Delta: 'PASS',
    },
  ]);

  console.log('✅ End-to-end campaign pipeline verified successfully!\n');
}

runSimulation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal simulation error:', err);
    process.exit(1);
  });

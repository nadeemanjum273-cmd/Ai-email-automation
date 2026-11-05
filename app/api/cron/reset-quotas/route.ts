import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Validate CRON_SECRET if configured (Vercel Cron automatically attaches this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron invocation.' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  try {
    // 1. Reset daily quotas for subscriptions that have not been reset today
    const { data: subsToReset, error: fetchErr } = await adminSupabase
      .from('subscriptions')
      .select('id, user_id, daily_emails_sent, last_reset_date')
      .or(`last_reset_date.lt.${todayStr},last_reset_date.is.null`);

    let resetCount = 0;
    if (subsToReset && subsToReset.length > 0) {
      const ids = subsToReset.map((s) => s.id);
      const { error: resetErr } = await adminSupabase
        .from('subscriptions')
        .update({
          daily_emails_sent: 0,
          last_reset_date: todayStr,
          updated_at: nowIso,
        })
        .in('id', ids);

      if (resetErr) {
        throw new Error(`Failed to reset daily quotas: ${resetErr.message}`);
      }
      resetCount = ids.length;
    }

    // 2. Mark expired 30-day subscriptions as 'expired'
    const { data: expiredSubs } = await adminSupabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'active')
      .lt('expires_at', nowIso);

    let expiredCount = 0;
    if (expiredSubs && expiredSubs.length > 0) {
      const expiredIds = expiredSubs.map((s) => s.id);
      await adminSupabase
        .from('subscriptions')
        .update({
          status: 'expired',
          updated_at: nowIso,
        })
        .in('id', expiredIds);
      expiredCount = expiredIds.length;
    }

    return NextResponse.json({
      success: true,
      message: `Daily quotas reset for ${resetCount} tenant(s). ${expiredCount} expired subscription(s) updated.`,
      resetCount,
      expiredCount,
      timestamp: nowIso,
    });
  } catch (err: unknown) {
    console.error('Error in cron quota reset:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error during quota reset',
      },
      { status: 500 }
    );
  }
}


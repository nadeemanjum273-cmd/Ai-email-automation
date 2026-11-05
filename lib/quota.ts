import { createAdminClient } from '@/lib/supabase/admin';

export interface QuotaValidationResult {
  canSend: boolean;
  remainingDaily: number;
  remainingMonthly: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailySent: number;
  monthlySent: number;
  error?: string;
}

/**
 * Validates and resets the tenant's daily email quota if a new day has arrived.
 * Checks daily limit (50 emails/day) and monthly limit (1,500 emails/month).
 */
export async function validateUserQuota(userId: string): Promise<QuotaValidationResult> {
  try {
    const adminSupabase = createAdminClient();
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Fetch current subscription
    const { data: sub, error } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !sub) {
      return {
        canSend: false,
        remainingDaily: 0,
        remainingMonthly: 0,
        dailyLimit: 50,
        monthlyLimit: 1500,
        dailySent: 0,
        monthlySent: 0,
        error: error?.message || 'No active subscription found.',
      };
    }

    // 2. Check subscription active status
    const subAny = sub as any;
    const dailyLimit = subAny.daily_limit ?? subAny.daily_email_limit ?? 50;
    const monthlyLimit = subAny.monthly_limit ?? subAny.monthly_email_limit ?? 1500;
    let dailySent = subAny.daily_sent ?? subAny.daily_emails_sent ?? 0;
    const monthlySent = subAny.monthly_sent ?? subAny.monthly_emails_sent ?? 0;

    if (sub.status !== 'active') {
      return {
        canSend: false,
        remainingDaily: 0,
        remainingMonthly: 0,
        dailyLimit,
        monthlyLimit,
        dailySent,
        monthlySent,
        error: 'Your subscription plan is currently not active.',
      };
    }

    // 3. Check expiration date
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      await adminSupabase
        .from('subscriptions')
        .update({ status: 'expired' } as any)
        .eq('id', sub.id);

      return {
        canSend: false,
        remainingDaily: 0,
        remainingMonthly: 0,
        dailyLimit,
        monthlyLimit,
        dailySent,
        monthlySent,
        error: 'Your 30-day subscription has expired. Please renew your plan.',
      };
    }

    // 4. Daily Quota Reset Logic
    const lastResetDate = sub.last_reset_date;

    if (!lastResetDate || lastResetDate < todayStr) {
      dailySent = 0;
      await adminSupabase
        .from('subscriptions')
        .update({
          daily_sent: 0,
          daily_emails_sent: 0,
          last_reset_date: todayStr,
        } as any)
        .eq('id', sub.id);
    }

    const remainingDaily = Math.max(0, dailyLimit - dailySent);
    const remainingMonthly = Math.max(0, monthlyLimit - monthlySent);
    const canSend = remainingDaily > 0 && remainingMonthly > 0;

    return {
      canSend,
      remainingDaily,
      remainingMonthly,
      dailyLimit,
      monthlyLimit,
      dailySent,
      monthlySent,
      error: canSend
        ? undefined
        : remainingDaily <= 0
        ? "Today's daily limit (50 emails) has been reached. Quota will reset tomorrow."
        : 'Monthly quota (1,500 emails) has been reached.',
    };
  } catch (err: unknown) {
    console.error('Error validating quota:', err);
    return {
      canSend: false,
      remainingDaily: 0,
      remainingMonthly: 0,
      dailyLimit: 50,
      monthlyLimit: 1500,
      dailySent: 0,
      monthlySent: 0,
      error: 'Technical error verifying quota.',
    };
  }
}

/**
 * Record sent emails and deduct from tenant daily and monthly quotas.
 */
export async function incrementQuotaUsage(
  userId: string,
  emailsSentCount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSupabase = createAdminClient();
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: sub } = await adminSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!sub) return { success: false, error: 'Subscription not found' };

    const subAny = sub as any;
    const isNewDay = !sub.last_reset_date || sub.last_reset_date < todayStr;
    const currentDaily = isNewDay ? 0 : subAny.daily_sent ?? subAny.daily_emails_sent ?? 0;
    const currentMonthly = subAny.monthly_sent ?? subAny.monthly_emails_sent ?? 0;

    const newDaily = currentDaily + emailsSentCount;
    const newMonthly = currentMonthly + emailsSentCount;

    const { error } = await adminSupabase
      .from('subscriptions')
      .update({
        daily_sent: newDaily,
        monthly_sent: newMonthly,
        last_reset_date: todayStr,
      } as any)
      .eq('id', sub.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to increment quota',
    };
  }
}

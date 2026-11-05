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
    if (sub.status !== 'active') {
      return {
        canSend: false,
        remainingDaily: 0,
        remainingMonthly: 0,
        dailyLimit: sub.daily_email_limit || 50,
        monthlyLimit: sub.monthly_email_limit || 1500,
        dailySent: sub.daily_emails_sent || 0,
        monthlySent: sub.monthly_emails_sent || 0,
        error: 'Your subscription plan is currently not active.',
      };
    }

    // 3. Check expiration date
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      await adminSupabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', sub.id);

      return {
        canSend: false,
        remainingDaily: 0,
        remainingMonthly: 0,
        dailyLimit: sub.daily_email_limit || 50,
        monthlyLimit: sub.monthly_email_limit || 1500,
        dailySent: sub.daily_emails_sent || 0,
        monthlySent: sub.monthly_emails_sent || 0,
        error: 'Your 30-day subscription has expired. Please renew your plan.',
      };
    }

    let dailySent = sub.daily_emails_sent || 0;
    const monthlySent = sub.monthly_emails_sent || 0;
    const dailyLimit = sub.daily_email_limit || 50;
    const monthlyLimit = sub.monthly_email_limit || 1500;

    // 4. Daily Quota Reset Logic
    const lastResetDate = sub.last_reset_date || sub.updated_at?.split('T')[0];

    if (!lastResetDate || lastResetDate < todayStr) {
      dailySent = 0;
      await adminSupabase
        .from('subscriptions')
        .update({
          daily_emails_sent: 0,
          last_reset_date: todayStr,
          updated_at: new Date().toISOString(),
        })
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
      .select('id, daily_emails_sent, monthly_emails_sent, last_reset_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (!sub) return { success: false, error: 'Subscription not found' };

    const isNewDay = !sub.last_reset_date || sub.last_reset_date < todayStr;
    const currentDaily = isNewDay ? 0 : sub.daily_emails_sent || 0;
    const currentMonthly = sub.monthly_emails_sent || 0;

    const { error } = await adminSupabase
      .from('subscriptions')
      .update({
        daily_emails_sent: currentDaily + emailsSentCount,
        monthly_emails_sent: currentMonthly + emailsSentCount,
        last_reset_date: todayStr,
        updated_at: new Date().toISOString(),
      })
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

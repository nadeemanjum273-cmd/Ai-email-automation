'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaymentRequest, Profile, Subscription } from '@/types/database';

/**
 * Helper to authenticate caller and verify 'admin' role.
 */
async function verifyAdminAuth() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required. Please log in.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<Pick<Profile, 'role'>[]>()
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('Access denied: Admin privileges required.');
  }

  return user;
}

/**
 * Fetch all pending payment requests joined with client profile details.
 * Defensive query: selects fields guaranteed to exist in profiles table to prevent schema mismatch errors.
 */
export async function getPendingRequests(): Promise<{
  success: boolean;
  data?: PaymentRequest[];
  error?: string;
}> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from('payment_requests')
      .select(`
        id,
        user_id,
        amount,
        currency,
        payment_method,
        sender_number,
        transaction_id,
        screenshot_url,
        status,
        admin_notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        profiles (
          id,
          full_name,
          email,
          role,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending payment requests:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as unknown as PaymentRequest[]) ?? [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pending requests';
    return { success: false, error: message };
  }
}

/**
 * Approve a client payment request:
 * 1. Mark payment_requests.status = 'approved'
 * 2. Update profiles.status = 'active'
 * 3. Reset/Upsert subscriptions: status = 'active', expires_at = NOW() + 30 days, quotas (50 daily, 1500 monthly)
 */
export async function approveUserPayment(
  paymentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days subscription

    // 1. Update payment request status
    const { error: paymentError } = await adminSupabase
      .from('payment_requests')
      .update({
        status: 'approved' as const,
        reviewed_by: adminUser.id,
        reviewed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', paymentId);

    if (paymentError) {
      console.error('Failed to update payment request status:', paymentError);
      return { success: false, error: `Payment update failed: ${paymentError.message}` };
    }

    // 2. Update profile status to 'active'
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        status: 'active' as const,
        updated_at: now.toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to activate profile:', profileError);
      return { success: false, error: `Profile activation failed: ${profileError.message}` };
    }

    // 3. Upsert client subscription with standard quotas (PKR 3,000/mo, 50 daily, 1500 monthly)
    const { data: existingSub } = await adminSupabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .returns<Pick<Subscription, 'id'>[]>()
      .maybeSingle();

    if (existingSub) {
      const { error: subError } = await adminSupabase
        .from('subscriptions')
        .update({
          plan_name: 'Standard PKR 3,000/Month',
          status: 'active' as const,
          daily_email_limit: 50,
          monthly_email_limit: 1500,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId);

      if (subError) {
        console.error('Failed to update existing subscription:', subError);
        return { success: false, error: `Subscription update failed: ${subError.message}` };
      }
    } else {
      const { error: insertSubError } = await adminSupabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_name: 'Standard PKR 3,000/Month',
          status: 'active' as const,
          daily_email_limit: 50,
          monthly_email_limit: 1500,
          daily_emails_sent: 0,
          monthly_emails_sent: 0,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (insertSubError) {
        console.error('Failed to create new subscription:', insertSubError);
        return { success: false, error: `Subscription creation failed: ${insertSubError.message}` };
      }
    }

    revalidatePath('/admin/requests');
    revalidatePath('/admin');
    revalidatePath('/admin/users');
    revalidatePath('/admin/quotas');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Approval failed';
    return { success: false, error: message };
  }
}

/**
 * Reject a client payment request with a reason/admin notes.
 */
export async function rejectUserPayment(
  paymentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await verifyAdminAuth();
    const adminSupabase = createAdminClient();
    const now = new Date();

    const { error } = await adminSupabase
      .from('payment_requests')
      .update({
        status: 'rejected' as const,
        admin_notes: reason,
        reviewed_by: adminUser.id,
        reviewed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Failed to reject payment request:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/requests');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Rejection failed';
    return { success: false, error: message };
  }
}

/**
 * Fetch all registered tenants & clients for the admin panel.
 */
export async function getAllTenants(): Promise<{
  success: boolean;
  data?: Profile[];
  error?: string;
}> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch tenants' };
  }
}

/**
 * Update tenant status (active, suspended, pending) or promote to admin.
 */
export async function updateTenantStatus(
  userId: string,
  status: 'active' | 'suspended' | 'pending',
  role?: 'client' | 'admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    const updatePayload: {
      status: 'active' | 'suspended' | 'pending';
      role?: 'client' | 'admin';
      updated_at: string;
    } = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (role) {
      updatePayload.role = role;
    }

    const { error } = await adminSupabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update tenant' };
  }
}

/**
 * Fetch all subscriptions with tenant profile info for Quota Management.
 */
export async function getAllQuotas(): Promise<{
  success: boolean;
  data?: (Subscription & { profiles?: Profile | null })[];
  error?: string;
}> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from('subscriptions')
      .select(`
        *,
        profiles (
          id,
          full_name,
          email,
          role,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as unknown as (Subscription & { profiles?: Profile | null })[]) || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch quotas' };
  }
}

/**
 * Manually reset daily quota for a specific subscription.
 */
export async function resetDailyQuota(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    const todayStr = new Date().toISOString().split('T')[0];
    const { error } = await adminSupabase
      .from('subscriptions')
      .update({
        daily_emails_sent: 0,
        last_reset_date: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/quotas');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to reset quota' };
  }
}

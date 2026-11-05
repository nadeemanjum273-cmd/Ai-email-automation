'use server';

import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthorizedClientForUser } from '@/lib/google';
import { validateUserQuota } from '@/lib/quota';

/**
 * Extracts a Google Spreadsheet ID from a URL or raw ID string.
 */
function extractSheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Fetches available sheet header columns and sheet tabs using the user's connected Google account.
 */
export async function fetchSheetColumns(sheetUrlOrId: string): Promise<{
  success: boolean;
  sheetId?: string;
  sheetName?: string;
  columns?: string[];
  sheets?: string[];
  error?: string;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Please sign in first.' };
    }

    const sheetId = extractSheetId(sheetUrlOrId);
    if (!sheetId || sheetId.length < 10) {
      return { success: false, error: 'Please provide a valid Google Sheet URL or ID.' };
    }

    // Get authorized Google client for this user
    const { oauth2Client } = await getAuthorizedClientForUser(user.id);
    const sheetsApi = google.sheets({ version: 'v4', auth: oauth2Client });

    // 1. Fetch metadata to get title and sheet tabs
    const meta = await sheetsApi.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheetTabs = meta.data.sheets?.map((s) => s.properties?.title || 'Sheet1') || ['Sheet1'];
    const activeSheetName = sheetTabs[0];

    // 2. Fetch first row (Headers)
    const headerRes = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${activeSheetName}'!A1:Z1`,
    });

    const rows = headerRes.data.values;
    if (!rows || rows.length === 0 || rows[0].length === 0) {
      return {
        success: false,
        error: 'The first row of the Google Sheet is empty. Header column titles starting from row A1 are required.',
      };
    }

    const columns: string[] = rows[0].map((col: unknown, index: number) => {
      const val = String(col).trim();
      return val || `Column ${String.fromCharCode(65 + index)}`;
    });

    return {
      success: true,
      sheetId,
      sheetName: activeSheetName,
      sheets: sheetTabs,
      columns,
    };
  } catch (err: unknown) {
    console.error('Error fetching sheet columns:', err);
    let errorMsg = 'Failed to fetch Google Sheet columns.';
    if (err instanceof Error) {
      if (err.message.includes('Google account is not connected')) {
        errorMsg = 'Your Google account is not connected. Please connect your Google account above.';
      } else if (err.message.includes('The caller does not have permission') || err.message.includes('403')) {
        errorMsg = 'Permission denied for this Google Sheet. Ensure the sheet is shared with your connected Google account.';
      } else if (err.message.includes('Requested entity was not found') || err.message.includes('404')) {
        errorMsg = 'Google Sheet not found. Please verify the sheet URL or ID.';
      } else {
        errorMsg = err.message;
      }
    }
    return { success: false, error: errorMsg };
  }
}

export interface SaveCampaignInput {
  title?: string;
  sheetUrl: string;
  sheetId: string;
  sheetName?: string;
  columnName: string;
  columnEmail: string;
  columnNiche: string;
  columnStatus: string;
  subjectTemplate: string;
  bodyTemplate: string;
  batchSize: number;
}

/**
 * Saves or launches a new cold outreach campaign.
 */
export async function saveCampaign(input: SaveCampaignInput): Promise<{
  success: boolean;
  campaignId?: string;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Please sign in first.' };
    }

    // 1. Quota validation check
    const quota = await validateUserQuota(user.id);
    if (!quota.canSend) {
      return {
        success: false,
        error: quota.error || 'You do not have enough email sending quota remaining.',
      };
    }

    if (input.batchSize > quota.remainingDaily) {
      return {
        success: false,
        error: `Batch size (${input.batchSize}) exceeds today's remaining daily quota (${quota.remainingDaily}).`,
      };
    }

    // 2. Validate inputs
    if (!input.sheetId || !input.columnEmail || !input.subjectTemplate || !input.bodyTemplate) {
      return {
        success: false,
        error: 'Sheet ID, Email Column, Subject Template, and Body Template are required.',
      };
    }

    const adminSupabase = createAdminClient();

    const { data: campaign, error: campaignError } = await adminSupabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        title: input.title || 'Cold Outreach Campaign',
        sheet_url: input.sheetUrl,
        sheet_id: input.sheetId,
        sheet_name: input.sheetName || 'Sheet1',
        column_name: input.columnName,
        column_email: input.columnEmail,
        column_niche: input.columnNiche,
        column_status: input.columnStatus,
        subject_template: input.subjectTemplate,
        body_template: input.bodyTemplate,
        batch_size: input.batchSize || 10,
        status: 'active',
      })
      .select('id')
      .single();

    if (campaignError) {
      console.error('Error saving campaign:', campaignError);
      return { success: false, error: campaignError.message };
    }

    revalidatePath('/dashboard');
    return { success: true, campaignId: campaign?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to save campaign.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Disconnects the user's Google account
 */
export async function disconnectGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const adminSupabase = createAdminClient();
    await adminSupabase
      .from('google_connections')
      .update({
        is_connected: false,
        access_token: '',
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Disconnect failed',
    };
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleOAuth2Client } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const stateUserId = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const origin = request.nextUrl.origin;
  const dashboardUrl = new URL('/dashboard', origin);

  if (errorParam) {
    dashboardUrl.searchParams.set('error', `Google access denied: ${errorParam}`);
    return NextResponse.redirect(dashboardUrl);
  }

  if (!code) {
    dashboardUrl.searchParams.set('error', 'No authorization code returned from Google');
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    // 1. Identify which user is connecting Google
    const supabase = createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    const targetUserId = sessionUser?.id || stateUserId;

    if (!targetUserId) {
      dashboardUrl.pathname = '/login';
      dashboardUrl.searchParams.set('error', 'User session expired during Google connection');
      return NextResponse.redirect(dashboardUrl);
    }

    // 2. Exchange authorization code for tokens
    const redirectUri = `${origin}/api/auth/google/callback`;
    const oauth2Client = getGoogleOAuth2Client(redirectUri);

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token) {
      throw new Error('Google did not return an access token.');
    }

    // 3. Extract connected Google email
    let googleEmail = '';

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      googleEmail = userInfo.data.email || '';
    } catch (userInfoErr) {
      console.warn('Could not fetch userinfo via API, attempting id_token parse:', userInfoErr);
      if (tokens.id_token) {
        const parts = tokens.id_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          googleEmail = payload.email || '';
        }
      }
    }

    if (!googleEmail) {
      googleEmail = 'connected-account@gmail.com';
    }

    // 4. Upsert into google_connections table
    const adminSupabase = createAdminClient();

    // Preserve existing refresh token if Google didn't send a new one
    let finalRefreshToken = tokens.refresh_token || null;
    const { data: existingConn } = await adminSupabase
      .from('google_connections')
      .select('id, refresh_token')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existingConn?.refresh_token && !finalRefreshToken) {
      finalRefreshToken = existingConn.refresh_token;
    }

    const connPayload: Record<string, any> = {
      user_id: targetUserId,
      google_email: googleEmail,
      access_token: tokens.access_token,
      refresh_token: finalRefreshToken,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      is_connected: true,
    };

    let upsertError: any = null;
    if (existingConn?.id) {
      const { error } = await adminSupabase
        .from('google_connections')
        .update(connPayload as any)
        .eq('id', existingConn.id);
      upsertError = error;
    } else {
      const { error } = await adminSupabase
        .from('google_connections')
        .insert(connPayload as any);
      upsertError = error;
    }

    if (upsertError) {
      console.error('Error saving google_connections:', upsertError);
      dashboardUrl.searchParams.set('error', `Failed to save Google connection: ${upsertError.message}`);
      return NextResponse.redirect(dashboardUrl);
    }

    dashboardUrl.searchParams.set('google', 'connected');
    return NextResponse.redirect(dashboardUrl);
  } catch (err: unknown) {
    console.error('OAuth callback exchange error:', err);
    const message = err instanceof Error ? err.message : 'Google OAuth exchange failed';
    dashboardUrl.searchParams.set('error', message);
    return NextResponse.redirect(dashboardUrl);
  }
}


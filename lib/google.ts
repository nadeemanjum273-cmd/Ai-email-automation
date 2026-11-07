import { google } from 'googleapis';
import { createAdminClient } from '@/lib/supabase/admin';

export function getGoogleOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const configuredRedirectUri =
    redirectUri ||
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are missing.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, configuredRedirectUri);
}

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Gets an authorized Google OAuth2 client for a given user.
 * Automatically refreshes the access token if expired and updates google_connections.
 */
export async function getAuthorizedClientForUser(userId: string) {
  const adminSupabase = createAdminClient();

  const { data: connection, error } = await adminSupabase
    .from('google_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !connection || !connection.is_connected) {
    throw new Error('Google account is not connected. Please connect your Google account.');
  }

  const oauth2Client = getGoogleOAuth2Client();

  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token || undefined,
    expiry_date: connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : undefined,
  });

  // Listen for automatic token refresh event
  oauth2Client.on('tokens', async (tokens) => {
    const updatePayload: Record<string, any> = {};
    if (tokens.access_token) {
      updatePayload.access_token = tokens.access_token;
    }
    if (tokens.refresh_token) {
      updatePayload.refresh_token = tokens.refresh_token;
    }
    if (tokens.expiry_date) {
      updatePayload.token_expires_at = new Date(tokens.expiry_date).toISOString();
    }

    await adminSupabase
      .from('google_connections')
      .update(updatePayload as any)
      .eq('user_id', userId);
  });

  // If token is expired or close to expiring, force refresh if refresh_token exists
  if (
    connection.token_expires_at &&
    new Date(connection.token_expires_at).getTime() - Date.now() < 60000 &&
    connection.refresh_token
  ) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken();
      const credentials = refreshed.credentials;
      await adminSupabase
        .from('google_connections')
        .update({
          access_token: credentials.access_token || connection.access_token,
          refresh_token: credentials.refresh_token || connection.refresh_token,
          token_expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : connection.token_expires_at,
        } as any)
        .eq('user_id', userId);
    } catch (refreshErr) {
      console.error('Failed to refresh Google token:', refreshErr);
    }
  }

  return { oauth2Client, connection };
}

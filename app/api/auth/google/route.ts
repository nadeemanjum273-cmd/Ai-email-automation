import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleOAuth2Client, GOOGLE_SCOPES } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', '/dashboard');
      return NextResponse.redirect(loginUrl);
    }

    // Determine redirect URI dynamically based on incoming request origin if needed
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const oauth2Client = getGoogleOAuth2Client(redirectUri);

    // Generate consent screen URL with offline access and force consent
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state: user.id, // Pass user id in state to verify in callback
    });

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    console.error('Google OAuth initialization error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Failed to initialize Google login';
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(errorMsg)}`, request.url)
    );
  }
}

/**
 * Disconnect Google Account
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('google_connections')
      .update({
        is_connected: false,
        access_token: '',
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Disconnect failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


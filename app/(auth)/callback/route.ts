import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/editor';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle error from OAuth provider
  if (error) {
    const errorMessage = encodeURIComponent(errorDescription || 'Authentication failed');
    return NextResponse.redirect(`${origin}/login?error=${errorMessage}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Successful authentication - redirect to intended destination
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Log the error for debugging (in production, use proper logging)
    console.error('Auth callback error:', exchangeError.message);

    // Redirect to login with error
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Failed to verify your account. Please try again.')}`
    );
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login`);
}

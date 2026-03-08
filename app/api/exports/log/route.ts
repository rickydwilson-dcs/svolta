import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * POST /api/exports/log
 *
 * Logs an export event for analytics tracking.
 * Called after every successful export (anonymous, free, or pro).
 *
 * Uses service role client to bypass RLS for analytics logging.
 *
 * Request body:
 * {
 *   export_format: 'png' | 'gif',
 *   aspect_ratio?: '1:1' | '4:5' | '9:16',
 *   anon_id?: string  // For anonymous users - browser fingerprint or session ID
 * }
 *
 * Response:
 * { success: true, id: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const { export_format, aspect_ratio, anon_id } = body;

    // Validate export_format
    if (!export_format || !['png', 'gif'].includes(export_format)) {
      return NextResponse.json(
        { error: 'Invalid export_format. Must be "png" or "gif".' },
        { status: 400 }
      );
    }

    // Validate aspect_ratio if provided
    if (aspect_ratio && !['1:1', '4:5', '9:16'].includes(aspect_ratio)) {
      return NextResponse.json(
        { error: 'Invalid aspect_ratio. Must be "1:1", "4:5", or "9:16".' },
        { status: 400 }
      );
    }

    // Use regular client to check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userType: 'anonymous' | 'free' | 'pro' = 'anonymous';
    let userId: string | null = null;

    if (user) {
      userId = user.id;

      // Check subscription status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', user.id)
        .single();

      if (subscription?.tier === 'pro' && subscription?.status === 'active') {
        userType = 'pro';
      } else {
        userType = 'free';
      }
    }

    // Service role client -- bypasses RLS to insert analytics without per-user write policies
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('exports')
      .insert({
        user_id: userId,
        user_type: userType,
        anon_id: userType === 'anonymous' ? anon_id : null,
        export_format,
        aspect_ratio: aspect_ratio || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error logging export:', error);
      // Don't fail the user's export if logging fails
      return NextResponse.json({ success: false, error: 'Failed to log export' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Export log API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

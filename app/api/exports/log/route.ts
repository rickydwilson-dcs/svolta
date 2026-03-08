import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { usageLogger } from '@/lib/logger';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { validateRequest, ExportLogSchema } from '@/lib/validation/api-schemas';

/**
 * POST /api/exports/log
 *
 * Logs an export event for analytics tracking.
 * Called after every successful export (anonymous, free, or pro).
 *
 * Uses service role client to bypass RLS for analytics logging.
 */
export async function POST(request: Request) {
  return withRateLimit<
    | { error: string }
    | { success: false; error: string }
    | { success: true; id: string }
  >(request, 'exports-log', async () => {
    try {
      const validation = await validateRequest(request, ExportLogSchema);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const { export_format, aspect_ratio, anon_id } = validation.data;

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
        usageLogger.error('Error logging export', error);
        return NextResponse.json({ success: false, error: 'Failed to log export' }, { status: 500 });
      }

      return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
      usageLogger.error('Export log API error', error);
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  });
}

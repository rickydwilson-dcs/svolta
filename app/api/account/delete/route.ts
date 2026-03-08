import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getStripe } from '@/lib/stripe/server';
import { logAuditEvent } from '@/lib/audit/logger';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { validateRequest, DeleteAccountSchema } from '@/lib/validation/api-schemas';
import { authLogger } from '@/lib/logger';

/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the user's account and all associated data.
 *
 * Rate limited: 2 requests per hour (prevents accidental cascading deletes)
 */
export async function DELETE(request: Request) {
  return withRateLimit<{ error: string } | { success: boolean; message: string }>(
    request,
    'account-delete',
    async () => {
    // Validate request body
    const validation = await validateRequest(request, DeleteAccountSchema);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    try {
      // Verify user is authenticated
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

    const userId = user.id;
    const userEmail = user.email;
    const supabaseAdmin = createServiceClient();

    // Log audit event before deletion
    await logAuditEvent(
      userId,
      {
        action: 'account.delete',
        resourceType: 'user',
        resourceId: userId,
        metadata: { email: userEmail }
      },
      request
    );

    // Get user's Stripe customer ID before deletion
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    // Cancel any active Stripe subscriptions
    if (profile?.stripe_customer_id) {
      try {
        // List all subscriptions for this customer
        const subscriptions = await getStripe().subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active',
        });

        // Cancel each subscription
        for (const subscription of subscriptions.data) {
          await getStripe().subscriptions.cancel(subscription.id);
        }

        // Optionally delete the Stripe customer
        // await stripe.customers.del(profile.stripe_customer_id);
      } catch (stripeError) {
        authLogger.error('Error canceling Stripe subscriptions:', stripeError);
        // Continue with deletion even if Stripe fails
      }
    }

    // Delete related data in order (respecting foreign key constraints)
    // 1. Delete usage records
    const { error: usageError } = await supabaseAdmin
      .from('usage')
      .delete()
      .eq('user_id', userId);

    if (usageError) {
      authLogger.error('Error deleting usage records:', usageError);
    }

    // 2. Delete subscription records
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionError) {
      authLogger.error('Error deleting subscription:', subscriptionError);
    }

    // 3. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      authLogger.error('Error deleting profile:', profileError);
    }

    // 4. Delete user's uploaded logos from storage
    try {
      const { data: files } = await supabaseAdmin.storage
        .from('logos')
        .list(`${userId}`);

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${userId}/${file.name}`);
        await supabaseAdmin.storage.from('logos').remove(filePaths);
      }
    } catch (storageError) {
      authLogger.error('Error deleting storage files:', storageError);
    }

    // 5. Delete the auth user (this must be done last)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      authLogger.error('Error deleting auth user:', deleteUserError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

      return NextResponse.json({
        success: true,
        message: 'Account deleted successfully',
      });

    } catch (error) {
      authLogger.error('Account deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }
  });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/server';

/**
 * Create admin client for deletion operations (bypasses RLS)
 * Lazily initialized to avoid build-time errors when env vars aren't set
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase admin credentials not configured');
  }

  return createAdminClient(url, key);
}

/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the user's account and all associated data.
 */
export async function DELETE() {
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
    const supabaseAdmin = getSupabaseAdmin();

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
        console.error('Error canceling Stripe subscriptions:', stripeError);
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
      console.error('Error deleting usage records:', usageError);
    }

    // 2. Delete subscription records
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionError) {
      console.error('Error deleting subscription:', subscriptionError);
    }

    // 3. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
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
      console.error('Error deleting storage files:', storageError);
    }

    // 5. Delete the auth user (this must be done last)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
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
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

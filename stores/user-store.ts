import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Subscription, Usage } from '@/types/database';
import { FREE_EXPORT_LIMIT } from '@/lib/stripe/plans';
import { getCurrentBillingPeriod } from '@/lib/utils/billing-period';

interface UserState {
  // Data
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  usage: Usage | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Computed getters
  isPro: () => boolean;
  canExport: () => boolean;
  exportsRemaining: () => number;
  exportLimit: () => number;

  // Actions
  initialize: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  incrementUsage: () => Promise<{ success: boolean; remaining: number }>;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  subscription: null,
  usage: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  // Computed getters
  isPro: () => {
    const { subscription, profile } = get();
    // Check subscription first, then profile for backwards compatibility
    if (subscription) {
      return subscription.tier === 'pro' && subscription.status === 'active';
    }
    if (profile) {
      return profile.subscription_tier === 'pro' && profile.subscription_status === 'active';
    }
    return false;
  },

  canExport: () => {
    const { isPro, exportsRemaining } = get();
    if (isPro()) return true;
    return exportsRemaining() > 0;
  },

  exportsRemaining: () => {
    const { isPro, usage } = get();
    if (isPro()) return Infinity;
    const used = usage?.exports_count ?? 0;
    return Math.max(0, FREE_EXPORT_LIMIT - used);
  },

  exportLimit: () => {
    const { isPro } = get();
    return isPro() ? Infinity : FREE_EXPORT_LIMIT;
  },

  // Actions
  initialize: async () => {
    const supabase = createClient();

    set({ isLoading: true, error: null });

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      // AuthSessionMissingError is expected when user is not logged in
      if (userError) {
        const isSessionMissing =
          userError.message?.includes('Auth session missing') ||
          userError.name === 'AuthSessionMissingError';

        if (isSessionMissing) {
          // User is simply not logged in - this is normal
          set({ user: null, profile: null, subscription: null, usage: null, isInitialized: true, isLoading: false });
          return;
        }
        throw userError;
      }

      if (!user) {
        set({ user: null, profile: null, subscription: null, usage: null, isInitialized: true, isLoading: false });
        return;
      }

      set({ user });

      // Fetch profile, subscription, and usage in parallel
      const { fetchProfile, fetchSubscription, fetchUsage } = get();
      await Promise.all([
        fetchProfile(),
        fetchSubscription(),
        fetchUsage(),
      ]);

      // Auth state change listener is now managed by UserProvider for proper cleanup
      set({ isInitialized: true });
    } catch (error) {
      console.error('Error initializing user store:', error);
      set({ error: 'Failed to initialize user data' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Profile might not exist yet if trigger hasn't run
        console.warn('Error fetching profile:', error.message);
        return;
      }

      set({ profile: data });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  fetchSubscription: async () => {
    const { user } = get();
    if (!user) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Subscription might not exist yet
        console.warn('Error fetching subscription:', error.message);
        return;
      }

      set({ subscription: data });
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  },

  fetchUsage: async () => {
    const { user } = get();
    if (!user) return;

    const supabase = createClient();
    const currentMonth = getCurrentBillingPeriod();

    try {
      const { data, error } = await supabase
        .from('usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - that's fine, user just hasn't exported yet
        console.warn('Error fetching usage:', error.message);
        return;
      }

      set({ usage: data ?? null });
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  },

  incrementUsage: async () => {
    const { user, isPro, canExport, exportsRemaining } = get();

    if (!user) {
      return { success: false, remaining: 0 };
    }

    // Pro users don't need to track - return success
    if (isPro()) {
      return { success: true, remaining: Infinity };
    }

    // Check if user can export
    if (!canExport()) {
      return { success: false, remaining: 0 };
    }

    const supabase = createClient();
    const currentMonth = getCurrentBillingPeriod();

    try {
      // Upsert usage record
      const { data, error } = await supabase
        .from('usage')
        .upsert(
          {
            user_id: user.id,
            month: currentMonth,
            exports_count: 1,
            last_export_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,month',
          }
        )
        .select()
        .single();

      if (error) {
        // Try incrementing existing record
        const { data: updated, error: updateError } = await supabase
          .from('usage')
          .update({
            exports_count: (get().usage?.exports_count ?? 0) + 1,
            last_export_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .select()
          .single();

        if (updateError) {
          console.error('Error incrementing usage:', updateError);
          return { success: false, remaining: exportsRemaining() };
        }

        set({ usage: updated });
        return {
          success: true,
          remaining: Math.max(0, FREE_EXPORT_LIMIT - (updated?.exports_count ?? 0))
        };
      }

      set({ usage: data });
      return {
        success: true,
        remaining: Math.max(0, FREE_EXPORT_LIMIT - (data?.exports_count ?? 0))
      };
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return { success: false, remaining: exportsRemaining() };
    }
  },

  signOut: async () => {
    const supabase = createClient();

    try {
      await supabase.auth.signOut();
      get().reset();
    } catch (error) {
      console.error('Error signing out:', error);
      // Reset anyway
      get().reset();
    }
  },

  reset: () => {
    set({
      user: null,
      profile: null,
      subscription: null,
      usage: null,
      isLoading: false,
      error: null,
    });
  },
}));

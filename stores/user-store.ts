import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Subscription, Usage } from '@/types/database';
import { FREE_EXPORT_LIMIT } from '@/lib/stripe/plans';
import { authLogger, usageLogger, stripeLogger } from '@/lib/logger';

export type IncrementFailReason = 'limit' | 'auth' | 'server' | 'network';

export type IncrementResult = {
  success: boolean;
  remaining: number;
  reason?: IncrementFailReason;
};

// localStorage keys for anonymous user exports
const ANON_EXPORTS_KEY = 'svolta_anon_exports';
const ANON_EXPORTS_MONTH_KEY = 'svolta_anon_exports_month';

/**
 * Get the current month in YYYY-MM format (for monthly reset)
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get anonymous user's export count from localStorage
 * Resets monthly to match server-side behavior
 */
function getAnonExportsFromStorage(): number {
  if (typeof window === 'undefined') return 0;

  const storedMonth = localStorage.getItem(ANON_EXPORTS_MONTH_KEY);
  const currentMonth = getCurrentMonth();

  // Reset if it's a new month
  if (storedMonth !== currentMonth) {
    localStorage.setItem(ANON_EXPORTS_MONTH_KEY, currentMonth);
    localStorage.setItem(ANON_EXPORTS_KEY, '0');
    return 0;
  }

  const count = localStorage.getItem(ANON_EXPORTS_KEY);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment anonymous user's export count in localStorage
 */
function incrementAnonExportsInStorage(): number {
  if (typeof window === 'undefined') return 0;

  const currentMonth = getCurrentMonth();
  localStorage.setItem(ANON_EXPORTS_MONTH_KEY, currentMonth);

  const current = getAnonExportsFromStorage();
  const newCount = current + 1;
  localStorage.setItem(ANON_EXPORTS_KEY, String(newCount));
  return newCount;
}

interface UserState {
  // Data
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  usage: Usage | null;
  anonExports: number; // Anonymous user exports (localStorage-backed)
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
  initAnonExports: () => void;
  incrementUsage: () => Promise<IncrementResult>;
  incrementAnonUsage: () => IncrementResult;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  subscription: null,
  usage: null,
  anonExports: 0,
  isLoading: false,
  isInitialized: false,
  error: null,

  // Computed getters
  isPro: () => {
    const { subscription } = get();
    // Check subscription table for tier status
    if (subscription) {
      return subscription.tier === 'pro' && subscription.status === 'active';
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
      authLogger.error('Error initializing user store:', error);
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
        authLogger.warn('Error fetching profile:', error.message);
        return;
      }

      set({ profile: data });
    } catch (error) {
      authLogger.error('Error fetching profile:', error);
    }
  },

  fetchSubscription: async () => {
    const { user } = get();
    if (!user) return;

    try {
      // Fetch via API route to bypass RLS issues
      const response = await fetch('/api/account/subscription');

      if (!response.ok) {
        stripeLogger.warn('Error fetching subscription:', response.status);
        return;
      }

      const data = await response.json();

      if (data.subscription) {
        set({ subscription: data.subscription });
      }
    } catch (error) {
      stripeLogger.error('Error fetching subscription:', error);
    }
  },

  fetchUsage: async () => {
    const { user } = get();
    if (!user) return;

    try {
      // Fetch via API route to bypass RLS issues
      const response = await fetch('/api/account/usage');

      if (!response.ok) {
        usageLogger.warn('Error fetching usage:', response.status);
        return;
      }

      const data = await response.json();
      set({ usage: data.usage ?? null });
    } catch (error) {
      usageLogger.error('Error fetching usage:', error);
    }
  },

  initAnonExports: () => {
    const count = getAnonExportsFromStorage();
    set({ anonExports: count });
  },

  incrementAnonUsage: () => {
    const { anonExports } = get();

    if (anonExports >= FREE_EXPORT_LIMIT) {
      return { success: false, remaining: 0, reason: 'limit' };
    }

    const newCount = incrementAnonExportsInStorage();
    set({ anonExports: newCount });

    return {
      success: true,
      remaining: Math.max(0, FREE_EXPORT_LIMIT - newCount),
    };
  },

  incrementUsage: async () => {
    const { user, isPro, canExport, exportsRemaining, fetchUsage } = get();

    if (!user) {
      return { success: false, remaining: 0, reason: 'auth' };
    }

    // Pro users don't need to track - return success
    if (isPro()) {
      return { success: true, remaining: Infinity };
    }

    // Check if user can export
    if (!canExport()) {
      return { success: false, remaining: 0, reason: 'limit' };
    }

    try {
      // Call the API endpoint to increment usage
      // This handles atomic increment with proper RLS bypass via server
      const response = await fetch('/api/usage/increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if limit was reached
        if (response.status === 403 && data.limit_reached) {
          return { success: false, remaining: 0, reason: 'limit' };
        }
        usageLogger.error('Error incrementing usage:', data.error);
        return { success: false, remaining: exportsRemaining(), reason: 'server' };
      }

      // Update local state with new usage data
      await fetchUsage();

      return {
        success: true,
        remaining: data.remaining === -1 ? Infinity : data.remaining,
      };
    } catch (error) {
      usageLogger.error('Error incrementing usage:', error);
      return { success: false, remaining: exportsRemaining(), reason: 'network' };
    }
  },

  signOut: async () => {
    const supabase = createClient();

    try {
      await supabase.auth.signOut({ scope: 'global' });
      get().reset();
    } catch (error) {
      authLogger.error('Error signing out:', error);
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
      isInitialized: true,
      error: null,
    });
  },
}));

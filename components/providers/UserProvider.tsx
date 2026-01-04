'use client';

import { useEffect, useRef } from 'react';
import { useUserStore } from '@/stores/user-store';
import { createClient } from '@/lib/supabase/client';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const initialize = useUserStore((state) => state.initialize);
  const isInitialized = useUserStore((state) => state.isInitialized);
  const fetchProfile = useUserStore((state) => state.fetchProfile);
  const fetchSubscription = useUserStore((state) => state.fetchSubscription);
  const fetchUsage = useUserStore((state) => state.fetchUsage);
  const reset = useUserStore((state) => state.reset);
  const initErrorRef = useRef<string | null>(null);

  // Initialize user store
  useEffect(() => {
    if (!isInitialized) {
      // Check if env vars are available before initializing
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
        console.warn('Supabase not configured, skipping user initialization');
        initErrorRef.current = 'Supabase environment variables not configured';
        return;
      }

      initialize().catch((error) => {
        console.error('Failed to initialize user:', error);
        initErrorRef.current = error.message;
      });
    }
  }, [initialize, isInitialized]);

  // Set up auth state change listener with proper cleanup
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
      return;
    }

    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          reset();
        } else if (event === 'SIGNED_IN' && session?.user) {
          useUserStore.setState({ user: session.user });
          await Promise.all([
            fetchProfile(),
            fetchSubscription(),
            fetchUsage(),
          ]);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          useUserStore.setState({ user: session.user });
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchSubscription, fetchUsage, reset]);

  return <>{children}</>;
}

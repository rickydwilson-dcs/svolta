'use client';

import { useEffect, useRef } from 'react';
import { useUserStore } from '@/stores/user-store';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const initialize = useUserStore((state) => state.initialize);
  const isInitialized = useUserStore((state) => state.isInitialized);
  const initErrorRef = useRef<string | null>(null);

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

  return <>{children}</>;
}

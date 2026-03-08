'use client';

import { useEffect, useCallback } from 'react';
import { useUserStore } from '@/stores/user-store';
import type { IncrementResult } from '@/stores/user-store';
import { FREE_EXPORT_LIMIT } from '@/lib/stripe/plans';

export interface UsageLimit {
  used: number;
  limit: number; // 5 for free, Infinity for pro (-1 in API responses means unlimited)
  remaining: number;
  canExport: boolean;
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  isAnonymous: boolean;

  checkAndIncrement: () => Promise<IncrementResult>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing usage limits and export permissions.
 * Handles both authenticated users (server-side tracking) and
 * anonymous users (localStorage tracking with monthly reset via Zustand store).
 */
export function useUsageLimit(): UsageLimit {
  const user = useUserStore((s) => s.user);
  const usage = useUserStore((s) => s.usage);
  const anonExports = useUserStore((s) => s.anonExports);
  const isLoading = useUserStore((s) => s.isLoading);
  const error = useUserStore((s) => s.error);
  const isPro = useUserStore((s) => s.isPro);
  const canExport = useUserStore((s) => s.canExport);
  const exportsRemaining = useUserStore((s) => s.exportsRemaining);
  const incrementUsage = useUserStore((s) => s.incrementUsage);
  const incrementAnonUsage = useUserStore((s) => s.incrementAnonUsage);
  const initAnonExports = useUserStore((s) => s.initAnonExports);
  const fetchUsage = useUserStore((s) => s.fetchUsage);

  // Initialize anonymous exports from localStorage on mount
  useEffect(() => {
    if (!user) {
      initAnonExports();
    }
  }, [user, initAnonExports]);

  // Check if user is pro
  const isProUser = isPro();

  // Determine if user is anonymous
  const isAnonymous = !user;

  // Calculate used count (from server for logged-in, store for anonymous)
  const used = isAnonymous ? anonExports : (usage?.exports_count ?? 0);

  // Get limit (Infinity for pro, FREE_EXPORT_LIMIT for free/anonymous)
  const limit = isProUser ? Infinity : FREE_EXPORT_LIMIT;

  // Get remaining exports
  const remaining = isAnonymous
    ? Math.max(0, FREE_EXPORT_LIMIT - anonExports)
    : exportsRemaining();

  // Check if user can export
  const canExportNow = isAnonymous
    ? anonExports < FREE_EXPORT_LIMIT
    : canExport();

  /**
   * Check if user can export and increment usage count.
   * Returns true if export was allowed and count was incremented.
   */
  const checkAndIncrement = useCallback(async (): Promise<IncrementResult> => {
    // Anonymous users: use store (localStorage-backed)
    if (!user) {
      return incrementAnonUsage();
    }

    // Logged-in users: use server-side tracking
    return await incrementUsage();
  }, [user, incrementUsage, incrementAnonUsage]);

  /**
   * Refresh usage data from the server (for logged-in users)
   * or from localStorage (for anonymous users).
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (user) {
      await fetchUsage();
    } else {
      initAnonExports();
    }
  }, [user, fetchUsage, initAnonExports]);

  return {
    used,
    limit,
    remaining,
    canExport: canExportNow,
    isPro: isProUser,
    isLoading,
    error,
    isAnonymous,
    checkAndIncrement,
    refresh,
  };
}

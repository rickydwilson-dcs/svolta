'use client';

import { useUserStore } from '@/stores/user-store';

export interface UsageLimit {
  used: number;
  limit: number; // 5 for free, Infinity for pro (-1 in API responses means unlimited)
  remaining: number;
  canExport: boolean;
  isPro: boolean;
  isLoading: boolean;
  error: string | null;

  checkAndIncrement: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing usage limits and export permissions.
 * Wraps the user store functionality in a convenient interface.
 */
export function useUsageLimit(): UsageLimit {
  const {
    user,
    usage,
    isLoading,
    error,
    isPro,
    canExport,
    exportsRemaining,
    exportLimit,
    incrementUsage,
    fetchUsage,
  } = useUserStore();

  // Calculate used count
  const used = usage?.exports_count ?? 0;

  // Get limit (Infinity for pro, 5 for free)
  const limit = exportLimit();

  // Get remaining exports
  const remaining = exportsRemaining();

  // Check if user is pro
  const isProUser = isPro();

  // Check if user can export
  const canExportNow = canExport();

  /**
   * Check if user can export and increment usage count.
   * Returns true if export was allowed and count was incremented.
   */
  const checkAndIncrement = async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    const result = await incrementUsage();
    return result.success;
  };

  /**
   * Refresh usage data from the server.
   */
  const refresh = async (): Promise<void> => {
    await fetchUsage();
  };

  return {
    used,
    limit,
    remaining,
    canExport: canExportNow,
    isPro: isProUser,
    isLoading,
    error,
    checkAndIncrement,
    refresh,
  };
}

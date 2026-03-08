"use client";

import { useEffect } from "react";

/**
 * Catches ChunkLoadError from stale deployments and auto-reloads once.
 * Uses sessionStorage to prevent infinite reload loops.
 */
export function ChunkErrorReload() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const isChunkError =
        event.message?.includes("ChunkLoadError") ||
        event.message?.includes("Loading chunk") ||
        event.error?.name === "ChunkLoadError";

      if (!isChunkError) return;

      const key = "svolta-chunk-reload";
      const lastReload = sessionStorage.getItem(key);
      const now = Date.now();

      // Only auto-reload once per 60 seconds to prevent loops
      if (lastReload && now - Number(lastReload) < 60_000) return;

      sessionStorage.setItem(key, String(now));
      window.location.reload();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const isChunkError =
        reason?.name === "ChunkLoadError" ||
        reason?.message?.includes("ChunkLoadError") ||
        reason?.message?.includes("Loading chunk");

      if (!isChunkError) return;

      const key = "svolta-chunk-reload";
      const lastReload = sessionStorage.getItem(key);
      const now = Date.now();

      if (lastReload && now - Number(lastReload) < 60_000) return;

      sessionStorage.setItem(key, String(now));
      window.location.reload();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

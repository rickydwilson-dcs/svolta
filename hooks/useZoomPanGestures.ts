import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';

interface ZoomPanGestureOptions {
  onZoomChange: (newZoom: number) => void;
  onPanChange: (newPanX: number, newPanY: number) => void;
  getCurrentState: () => { zoom: number; panX: number; panY: number };
  minZoom?: number;
  maxZoom?: number;
  enabled?: boolean;
}

export function useZoomPanGestures(
  containerRef: RefObject<HTMLElement | null>,
  options: ZoomPanGestureOptions
) {
  const {
    onZoomChange,
    onPanChange,
    getCurrentState,
    minZoom = 1.0,
    maxZoom = 3.0,
    enabled = true,
  } = options;

  // Use refs so event handlers always have latest values without re-registering
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const rafRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ panX: number; panY: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchMidRef = useRef<{ x: number; y: number } | null>(null);

  const flushRaf = useCallback(() => {
    rafRef.current = null;
    const opts = optionsRef.current;
    if (pendingZoomRef.current !== null) {
      opts.onZoomChange(pendingZoomRef.current);
      pendingZoomRef.current = null;
    }
    if (pendingPanRef.current !== null) {
      opts.onPanChange(pendingPanRef.current.panX, pendingPanRef.current.panY);
      pendingPanRef.current = null;
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushRaf);
    }
  }, [flushRaf]);

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.style.touchAction = 'none';

    // ── Wheel (trackpad pinch + scroll-wheel zoom) ──────────────────────────
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom } = optionsRef.current.getCurrentState();
      const newZoom = clamp(zoom * (1 - e.deltaY * 0.01), minZoom, maxZoom);
      pendingZoomRef.current = newZoom;
      scheduleFlush();
    };

    // ── Touch (pinch zoom + single-finger pan) ──────────────────────────────
    const getTouchDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const getTouchMid = (t: TouchList) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        lastTouchDistRef.current = getTouchDist(e.touches);
        lastTouchMidRef.current = getTouchMid(e.touches);
      } else if (e.touches.length === 1) {
        const { panX, panY } = optionsRef.current.getCurrentState();
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX,
          panY,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();

      if (e.touches.length === 2) {
        const newDist = getTouchDist(e.touches);
        const prevDist = lastTouchDistRef.current;
        if (prevDist !== null && prevDist > 0) {
          const { zoom } = optionsRef.current.getCurrentState();
          const newZoom = clamp(zoom * (newDist / prevDist), minZoom, maxZoom);
          pendingZoomRef.current = newZoom;
        }
        lastTouchDistRef.current = newDist;
        lastTouchMidRef.current = getTouchMid(e.touches);
        scheduleFlush();
      } else if (e.touches.length === 1 && dragStartRef.current) {
        const dx = e.touches[0].clientX - dragStartRef.current.x;
        const dy = e.touches[0].clientY - dragStartRef.current.y;
        const newPanX = clamp(dragStartRef.current.panX + dx / rect.width * 2, -1, 1);
        const newPanY = clamp(dragStartRef.current.panY + dy / rect.height * 2, -1, 1);
        pendingPanRef.current = { panX: newPanX, panY: newPanY };
        scheduleFlush();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastTouchDistRef.current = null;
        lastTouchMidRef.current = null;
      }
      if (e.touches.length === 0) {
        dragStartRef.current = null;
      }
    };

    // ── Pointer drag pan ─────────────────────────────────────────────────────
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // handled by touch events
      const { panX, panY } = optionsRef.current.getCurrentState();
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
      container.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      if (e.pointerType === 'touch') return;
      const rect = container.getBoundingClientRect();
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newPanX = clamp(dragStartRef.current.panX + dx / rect.width * 2, -1, 1);
      const newPanY = clamp(dragStartRef.current.panY + dy / rect.height * 2, -1, 1);
      pendingPanRef.current = { panX: newPanX, panY: newPanY };
      scheduleFlush();
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);

    return () => {
      container.style.touchAction = '';
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [containerRef, enabled, minZoom, maxZoom, scheduleFlush]);

  return { isDragging: isDraggingRef };
}

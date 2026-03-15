'use client';

import { useEffect } from 'react';
import { useHeaderSlot } from './HeaderSlotContext';

/**
 * Renders nothing itself — use this in a page to inject content into the
 * shared header's right slot. The slot is cleared when the component unmounts.
 * Updates on every render so dynamic content (disabled state, counters) stays fresh.
 */
export function HeaderSlot({ children }: { children: React.ReactNode }) {
  const { setSlot } = useHeaderSlot();

  // Update on every render so dynamic content stays in sync
  useEffect(() => {
    setSlot(children);
  });

  // Clear on unmount
  useEffect(() => {
    return () => setSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

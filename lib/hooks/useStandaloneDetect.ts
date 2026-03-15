'use client';

import { useSyncExternalStore } from 'react';

function getSnapshot(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

export function useIsStandalone(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

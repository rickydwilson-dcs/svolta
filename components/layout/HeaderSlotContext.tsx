'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface HeaderSlotContextValue {
  slot: React.ReactNode;
  setSlot: (node: React.ReactNode) => void;
}

const HeaderSlotContext = createContext<HeaderSlotContextValue>({
  slot: null,
  setSlot: () => {},
});

export function HeaderSlotProvider({ children }: { children: React.ReactNode }) {
  const [slot, setSlotState] = useState<React.ReactNode>(null);
  const setSlot = useCallback((node: React.ReactNode) => setSlotState(node), []);

  return (
    <HeaderSlotContext.Provider value={{ slot, setSlot }}>
      {children}
    </HeaderSlotContext.Provider>
  );
}

export function useHeaderSlot() {
  return useContext(HeaderSlotContext);
}

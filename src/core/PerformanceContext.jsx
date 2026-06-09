import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getClock } from '../core/PerformanceClock';
import { getPerformanceStore } from '../performance-effects';

const PerformanceContext = createContext(null);

/**
 * Provides the shared PerformanceClock + PerformanceStore + live state
 * to all children via usePerformance() hook.
 */
export function PerformanceProvider({ children }) {
  const clockRef = useRef(getClock());
  const storeRef = useRef(getPerformanceStore());
  const [clockState, setClockState] = useState(clockRef.current.getState());

  useEffect(() => {
    const clock = clockRef.current;
    const unsub = clock.subscribe((state) => {
      setClockState({ ...state });
    });
    return unsub;
  }, []);

  const value = {
    clock: clockRef.current,
    store: storeRef.current,
    effects: storeRef.current.effects,
    ...clockState,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

/** Hook to access performance clock + store + effects */
export function usePerformance() {
  const ctx = useContext(PerformanceContext);
  if (!ctx) {
    throw new Error('usePerformance must be used within a <PerformanceProvider>');
  }
  return ctx;
}

export default PerformanceContext;

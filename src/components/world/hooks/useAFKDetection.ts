import { useCallback, useEffect, useRef } from 'react';

export const useAFKDetection = (
  timeout: number,
  onAFKChange: (isAFK: boolean) => void
) => {
  const lastActivityRef = useRef<number>(Date.now());
  const afkTimeoutRef = useRef<number | null>(null);

  const resetAFKTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (afkTimeoutRef.current) {
      window.clearTimeout(afkTimeoutRef.current);
    }
    
    afkTimeoutRef.current = window.setTimeout(() => {
      onAFKChange(true);
    }, timeout);

    onAFKChange(false);
  }, [timeout, onAFKChange]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onAFKChange(true);
      } else {
        resetAFKTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (afkTimeoutRef.current) {
        window.clearTimeout(afkTimeoutRef.current);
      }
    };
  }, [resetAFKTimer, onAFKChange]);

  return resetAFKTimer;
};
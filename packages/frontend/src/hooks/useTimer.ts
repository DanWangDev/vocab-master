import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  initialTime: number;  // seconds
  onComplete?: () => void;
  autoStart?: boolean;
}

interface UseTimerReturn {
  timeRemaining: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newTime?: number) => void;
  restart: (newTime?: number) => void;
}

export function useTimer(options: UseTimerOptions): UseTimerReturn {
  const { initialTime, onComplete, autoStart = false } = options;

  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Timer logic
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  const start = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
    }
  }, [timeRemaining]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newTime?: number) => {
    setIsRunning(false);
    setTimeRemaining(newTime ?? initialTime);
  }, [initialTime]);

  const restart = useCallback((newTime?: number) => {
    setTimeRemaining(newTime ?? initialTime);
    setIsRunning(true);
  }, [initialTime]);

  return {
    timeRemaining,
    isRunning,
    start,
    pause,
    reset,
    restart,
  };
}

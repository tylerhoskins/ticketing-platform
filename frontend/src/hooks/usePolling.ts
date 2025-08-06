"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePollingOptions {
  interval?: number; // polling interval in milliseconds
  immediate?: boolean; // start polling immediately
  stopOnError?: boolean; // stop polling on error
  maxRetries?: number; // maximum number of retries on error
  backoffMultiplier?: number; // exponential backoff multiplier
  maxInterval?: number; // maximum polling interval
}

interface UsePollingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isPolling: boolean;
  retryCount: number;
  lastUpdate: Date | null;
}

interface UsePollingReturn<T> extends UsePollingState<T> {
  startPolling: () => void;
  stopPolling: () => void;
  forceRefresh: () => Promise<void>;
  reset: () => void;
}

export function usePolling<T>(
  pollFn: () => Promise<T>,
  options: UsePollingOptions = {}
): UsePollingReturn<T> {
  const {
    interval = 2000,
    immediate = true,
    stopOnError = false,
    maxRetries = 3,
    backoffMultiplier = 1.5,
    maxInterval = 10000,
  } = options;

  const [state, setState] = useState<UsePollingState<T>>({
    data: null,
    loading: false,
    error: null,
    isPolling: false,
    retryCount: 0,
    lastUpdate: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalRef = useRef(interval);
  const isPollingRef = useRef(false);
  const pollFnRef = useRef(pollFn);


  // Update the ref when pollFn changes
  useEffect(() => {
    pollFnRef.current = pollFn;
  }, [pollFn]);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      globalThis.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!isPollingRef.current) {
      console.log('[usePolling] Polling stopped, skipping poll');
      return;
    }

    console.log('[usePolling] Starting poll...');
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await pollFnRef.current();


      console.log('[usePolling] Poll successful, updating state');
      setState((prev) => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        retryCount: 0,
        lastUpdate: new Date(),
      }));

      // Reset interval to original value on successful poll
      currentIntervalRef.current = interval;
    } catch (error) {

      const errorMessage =
        error instanceof Error ? error.message : "Polling failed";
      
      console.log('[usePolling] Poll failed:', errorMessage);

      setState((prev) => {
        const newRetryCount = prev.retryCount + 1;

        // Implement exponential backoff
        if (newRetryCount < maxRetries) {
          currentIntervalRef.current = Math.min(
            currentIntervalRef.current * backoffMultiplier,
            maxInterval
          );
        } else if (stopOnError) {
          console.log('[usePolling] Max retries reached, stopping polling');
          isPollingRef.current = false;
        }

        return {
          ...prev,
          loading: false,
          error: errorMessage,
          retryCount: newRetryCount,
          isPolling:
            stopOnError && newRetryCount >= maxRetries ? false : prev.isPolling,
        };
      });
    }

    // Schedule next poll - this is the critical part for continuation
    if (isPollingRef.current) {
      console.log(`[usePolling] Scheduling next poll in ${currentIntervalRef.current}ms`);
      timeoutRef.current = setTimeout(poll, currentIntervalRef.current);
    } else {
      console.log('[usePolling] Not scheduling next poll - polling stopped');
    }
  }, [interval, maxRetries, backoffMultiplier, maxInterval, stopOnError]);

  const startPolling = useCallback(() => {
    if (isPollingRef.current) {
      console.log('[usePolling] Already polling, ignoring startPolling call');
      return;
    }

    console.log('[usePolling] Starting polling...');
    isPollingRef.current = true;
    setState((prev) => ({ ...prev, isPolling: true, retryCount: 0 }));
    currentIntervalRef.current = interval;
    // Start polling immediately
    poll();
  }, [poll, interval]);

  const stopPolling = useCallback(() => {
    console.log('[usePolling] Stopping polling...');
    isPollingRef.current = false;
    setState((prev) => ({ ...prev, isPolling: false }));
    clearTimeout();
  }, [clearTimeout]);

  const forceRefresh = useCallback(async () => {
    clearTimeout();
    await poll();
  }, [poll, clearTimeout]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      data: null,
      loading: false,
      error: null,
      isPolling: false,
      retryCount: 0,
      lastUpdate: null,
    });
    currentIntervalRef.current = interval;
  }, [stopPolling, interval]);

  // Auto-start polling if immediate is true
  useEffect(() => {
    if (immediate) {
      startPolling();
    }
  }, [immediate, startPolling]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      clearTimeout();
    };
  }, []);

  return {
    ...state,
    startPolling,
    stopPolling,
    forceRefresh,
    reset,
  };
}

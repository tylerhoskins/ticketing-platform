'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { usePolling } from './usePolling';
import { apiClient } from '@/lib/api';
import { IntentStatus, PurchaseIntentStatus, CancelIntentRequest } from '@/types/queue';

interface UseQueueStatusOptions {
  pollInterval?: number;
  autoStop?: boolean; // automatically stop polling when intent is completed
  onStatusChange?: (status: IntentStatus) => void;
  onCompleted?: (status: IntentStatus) => void;
  onFailed?: (status: IntentStatus) => void;
}

interface UseQueueStatusReturn {
  status: IntentStatus | null;
  loading: boolean;
  error: string | null;
  isActive: boolean;
  isCompleted: boolean;
  isPolling: boolean;
  position: number | null;
  estimatedWait: number | null;
  startPolling: () => void;
  stopPolling: () => void;
  cancelIntent: (userSessionId: string) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  retryCount: number;
  lastUpdate: Date | null;
}

export function useQueueStatus(
  intentId: string | null,
  options: UseQueueStatusOptions = {}
): UseQueueStatusReturn {
  const {
    pollInterval = 2000,
    autoStop = true,
    onStatusChange,
    onCompleted,
    onFailed,
  } = options;

  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  
  // Track previous status to only trigger callbacks on transitions
  const previousStatusRef = useRef<PurchaseIntentStatus | null>(null);

  const pollFn = useCallback(async (): Promise<IntentStatus> => {
    if (!intentId) {
      throw new Error('No intent ID provided');
    }
    
    return await apiClient.getIntentStatus(intentId);
  }, [intentId]);

  const polling = usePolling<IntentStatus>(pollFn, {
    interval: pollInterval,
    immediate: !!intentId,
    stopOnError: false,
    maxRetries: 5,
    backoffMultiplier: 1.5,
    maxInterval: 10000,
  });

  const { data: status, loading, error, isPolling, startPolling, stopPolling, forceRefresh, reset, retryCount, lastUpdate } = polling;

  // Computed properties
  const isActive = status ? [PurchaseIntentStatus.WAITING, PurchaseIntentStatus.PROCESSING].includes(status.status) : false;
  const isCompleted = status ? [PurchaseIntentStatus.COMPLETED, PurchaseIntentStatus.FAILED, PurchaseIntentStatus.EXPIRED].includes(status.status) : false;
  const position = status?.queue_position || null;
  const estimatedWait = status?.estimated_wait_time || null;

  // Handle status changes - only trigger callbacks on actual status transitions
  useEffect(() => {
    if (status) {
      const currentStatus = status.status;
      const previousStatus = previousStatusRef.current;
      
      // Always trigger onStatusChange (if provided) for any status update
      if (onStatusChange) {
        onStatusChange(status);
      }
      
      // Only trigger completion/failure callbacks on actual status transitions
      if (currentStatus !== previousStatus) {
        console.log(`[useQueueStatus] Status transition: ${previousStatus} → ${currentStatus}`);
        
        if (currentStatus === PurchaseIntentStatus.COMPLETED && onCompleted) {
          console.log('[useQueueStatus] Triggering onCompleted callback');
          onCompleted(status);
        } else if (currentStatus === PurchaseIntentStatus.FAILED && onFailed) {
          console.log('[useQueueStatus] Triggering onFailed callback');
          onFailed(status);
        }
        
        // Update the previous status reference
        previousStatusRef.current = currentStatus;
      }

      // Auto-stop polling when completed (regardless of transition)
      if (isCompleted && autoStop && isPolling) {
        console.log('[useQueueStatus] Auto-stopping polling due to completion');
        stopPolling();
      }
    }
  }, [status, isCompleted, autoStop, isPolling, stopPolling, onStatusChange, onCompleted, onFailed]);

  // Reset previous status tracking when intentId changes
  useEffect(() => {
    previousStatusRef.current = null;
    console.log('[useQueueStatus] Reset previous status tracking for new intent:', intentId);
  }, [intentId]);

  // Cancel intent function
  const cancelIntent = useCallback(async (userSessionId: string) => {
    if (!intentId || !status) return;

    setCancelLoading(true);
    setCancelError(null);

    try {
      const request: CancelIntentRequest = {
        intent_id: intentId,
        user_session_id: userSessionId,
      };

      await apiClient.cancelPurchaseIntent(request);
      
      // Refresh status immediately after cancellation
      await forceRefresh();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel intent';
      setCancelError(errorMessage);
      throw error;
    } finally {
      setCancelLoading(false);
    }
  }, [intentId, status, forceRefresh]);

  // Reset function that also clears cancel state and previous status
  const resetWithCancel = useCallback(() => {
    reset();
    setCancelLoading(false);
    setCancelError(null);
    previousStatusRef.current = null;
    console.log('[useQueueStatus] Reset complete, cleared previous status tracking');
  }, [reset]);

  return {
    status,
    loading: loading || cancelLoading,
    error: error || cancelError,
    isActive,
    isCompleted,
    isPolling,
    position,
    estimatedWait,
    startPolling,
    stopPolling,
    cancelIntent,
    refresh: forceRefresh,
    reset: resetWithCancel,
    retryCount,
    lastUpdate,
  };
}

// Hook for managing multiple intents for a user session
export function useUserIntents(userSessionId: string, eventId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userIntents, setUserIntents] = useState<any>(null);

  const fetchUserIntents = useCallback(async () => {
    if (!userSessionId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.getUserIntents(userSessionId, eventId);
      setUserIntents(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user intents';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userSessionId, eventId]);

  useEffect(() => {
    fetchUserIntents();
  }, [fetchUserIntents]);

  return {
    userIntents,
    loading,
    error,
    refresh: fetchUserIntents,
  };
}
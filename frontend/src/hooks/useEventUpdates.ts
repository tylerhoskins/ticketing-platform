'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { Event } from '@/types/api';
import { usePolling } from './usePolling';

interface UseEventUpdatesOptions {
  /** Polling interval in milliseconds (default: 5000 for list, 3000 for single event) */
  pollInterval?: number;
  /** Start polling immediately (default: true) */
  immediate?: boolean;
  /** Stop polling on error (default: false) */
  stopOnError?: boolean;
  /** Event IDs to track specifically (for filtering) */
  eventIds?: string[];
  /** Single event ID for focused updates */
  eventId?: string;
  /** Pause polling when tab is not visible (default: true) */
  pauseWhenHidden?: boolean;
}

interface UseEventUpdatesReturn {
  /** Current events data */
  events: Event[];
  /** Single event data (when eventId is provided) */
  event: Event | null;
  /** Whether polling is active */
  isPolling: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Last update timestamp */
  lastUpdate: Date | null;
  /** Retry count for failed attempts */
  retryCount: number;
  /** Manually start polling */
  startPolling: () => void;
  /** Manually stop polling */
  stopPolling: () => void;
  /** Force refresh data immediately */
  forceRefresh: () => Promise<void>;
  /** Reset all state */
  reset: () => void;
  /** Whether there were recent changes to ticket counts */
  hasRecentChanges: boolean;
  /** Events that changed in the last poll */
  changedEvents: Set<string>;
}

export function useEventUpdates(options: UseEventUpdatesOptions = {}): UseEventUpdatesReturn {
  const {
    pollInterval,
    immediate = true,
    stopOnError = false,
    eventIds,
    eventId,
    pauseWhenHidden = true,
  } = options;

  // Determine default poll interval based on use case
  const defaultInterval = eventId ? 3000 : 5000;
  const finalInterval = pollInterval || defaultInterval;

  // State for tracking changes
  const [previousEvents, setPreviousEvents] = useState<Event[]>([]);
  const previousEventsRef = useRef<Event[]>([]);
  const [changedEvents, setChangedEvents] = useState<Set<string>>(new Set());
  const [hasRecentChanges, setHasRecentChanges] = useState(false);
  const changesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Visibility state for pausing when tab is hidden
  const [isVisible, setIsVisible] = useState(true);

  // Poll function that fetches either single event or all events
  const pollFn = useCallback(async (): Promise<Event[]> => {
    if (pauseWhenHidden && !isVisible) {
      // Return previous data if tab is not visible
      return previousEventsRef.current;
    }

    if (eventId) {
      // Fetch single event
      const event = await apiClient.getEvent(eventId);
      return [event];
    } else {
      // Fetch all events or filtered events
      const events = await apiClient.getEvents('date');
      
      if (eventIds && eventIds.length > 0) {
        
        return events.filter(event => eventIds.includes(event.id));
      }
      
      return events;
    }
  }, [eventId, eventIds, pauseWhenHidden, isVisible]);

  // Use the existing polling hook
  const {
    data: events,
    loading,
    error,
    isPolling,
    lastUpdate,
    retryCount,
    startPolling,
    stopPolling,
    forceRefresh,
    reset: resetPolling,
  } = usePolling(pollFn, {
    interval: finalInterval,
    immediate,
    stopOnError,
    maxRetries: 5,
    backoffMultiplier: 1.5,
    maxInterval: 30000,
  });

  // Track changes in ticket availability
  useEffect(() => {
    if (events && previousEventsRef.current.length > 0) {
      const changes = new Set<string>();
      
      events.forEach(currentEvent => {
        const previousEvent = previousEventsRef.current.find(prev => prev.id === currentEvent.id);
        
        if (previousEvent) {
          // Check if available tickets changed
          if (previousEvent.available_tickets !== currentEvent.available_tickets) {
            changes.add(currentEvent.id);
          }
          // Check if event version changed (indicates backend update)
          if (previousEvent.version !== currentEvent.version) {
            changes.add(currentEvent.id);
          }
        }
      });

      if (changes.size > 0) {
        setChangedEvents(changes);
        setHasRecentChanges(true);
        
        // Clear recent changes flag after 5 seconds
        if (changesTimeoutRef.current) {
          clearTimeout(changesTimeoutRef.current);
        }
        changesTimeoutRef.current = setTimeout(() => {
          setHasRecentChanges(false);
          setChangedEvents(new Set());
        }, 5000);
      }
    }
    
    if (events) {
      setPreviousEvents([...events]);
      previousEventsRef.current = [...events];
    }
  }, [events]);

  // Handle page visibility changes
  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      // If page becomes visible again, force a refresh to get latest data
      if (visible && isPolling) {
        forceRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseWhenHidden, isPolling, forceRefresh]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (changesTimeoutRef.current) {
        clearTimeout(changesTimeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    resetPolling();
    setPreviousEvents([]);
    previousEventsRef.current = [];
    setChangedEvents(new Set());
    setHasRecentChanges(false);
    if (changesTimeoutRef.current) {
      clearTimeout(changesTimeoutRef.current);
    }
  }, [resetPolling]);

  return {
    events: events || [],
    event: events && events.length > 0 ? events[0] : null,
    isPolling,
    loading,
    error,
    lastUpdate,
    retryCount,
    startPolling,
    stopPolling,
    forceRefresh,
    reset,
    hasRecentChanges,
    changedEvents,
  };
}

// Convenience hooks for specific use cases
export function useEventListUpdates(options: Omit<UseEventUpdatesOptions, 'eventId'> = {}) {
  return useEventUpdates({
    ...options,
    pollInterval: options.pollInterval || 5000,
  });
}

export function useEventDetailsUpdates(eventId: string, options: Omit<UseEventUpdatesOptions, 'eventId'> = {}) {
  return useEventUpdates({
    ...options,
    eventId,
    pollInterval: options.pollInterval || 3000,
  });
}
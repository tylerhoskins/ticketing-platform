'use client';

import React from 'react';
import {
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  useToast,
} from '@chakra-ui/react';
import { useEventListUpdates } from '@/hooks/useEventUpdates';
import EventList from '@/components/Events/EventList';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import ErrorMessage from '@/components/UI/ErrorMessage';
import LiveIndicator from '@/components/UI/LiveIndicator';

export default function HomePage() {
  const toast = useToast();

  const {
    events,
    loading,
    error,
    isPolling,
    lastUpdate,
    hasRecentChanges,
    changedEvents,
    forceRefresh,
    startPolling,
    stopPolling,
  } = useEventListUpdates({
    pollInterval: 5000,
    immediate: true,
    stopOnError: false,
  });

  // Debug logging
  // console.log('HomePage state:', { 
  //   eventsLength: events?.length || 0, 
  //   loading, 
  //   error, 
  //   isPolling,
  //   events: events?.slice(0, 1) // Only log first event to avoid clutter
  // });

  // Show toast notification when events are updated with changes
  React.useEffect(() => {
    if (hasRecentChanges && !loading && events.length > 0) {
      toast({
        title: 'Events Updated',
        description: 'Ticket availability has changed for some events.',
        status: 'info',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    }
  }, [hasRecentChanges, loading, events.length]);

  if (loading && events.length === 0) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error && events.length === 0) {
    return <ErrorMessage message={error} onRetry={forceRefresh} />;
  }

  return (
    <VStack spacing={8} align="stretch">
      <VStack spacing={4} textAlign="center">
        <Heading size="xl" color="brand.700">
          Welcome to Tixcel
        </Heading>
        <Text color="gray.600" fontSize="lg">
          Discover and purchase tickets for amazing events
        </Text>
      </VStack>

      {/* Live Updates Header */}
      <HStack justify="space-between" align="center" wrap="wrap">
        <HStack spacing={3}>
          <LiveIndicator
            isLive={isPolling}
            lastUpdate={lastUpdate}
            hasRecentChanges={hasRecentChanges}
            error={error}
            size="md"
            showTimestamp={true}
            showText={true}
          />
          {events.length > 0 && (
            <Text fontSize="sm" color="gray.600">
              {events.length} event{events.length !== 1 ? 's' : ''} loaded
            </Text>
          )}
        </HStack>

        <HStack spacing={2}>
          <Button
            size="sm"
            variant="outline"
            onClick={forceRefresh}
            isLoading={loading}
            loadingText="Refreshing"
          >
            Refresh Now
          </Button>
          
          <Button
            size="sm"
            variant={isPolling ? 'solid' : 'outline'}
            colorScheme={isPolling ? 'red' : 'green'}
            onClick={isPolling ? stopPolling : startPolling}
          >
            {isPolling ? 'Pause Live Updates' : 'Resume Live Updates'}
          </Button>
        </HStack>
      </HStack>

      {/* Show connection error banner if polling fails but we have cached data */}
      {error && events.length > 0 && (
        <ErrorMessage 
          message={`Connection issue: ${error}. Showing cached data.`}
          onRetry={forceRefresh}
          variant="warning"
        />
      )}

      <EventList 
        events={events}
        isLive={isPolling}
        lastUpdate={lastUpdate}
        changedEvents={changedEvents}
        error={error}
      />
    </VStack>
  );
}
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Grid,
  GridItem,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { ArrowBackIcon, CalendarIcon } from '@chakra-ui/icons';
import { formatDate, addComputedProperties } from '@/lib/api';
import { useEventDetailsUpdates } from '@/hooks/useEventUpdates';
import TicketPurchaseForm from '@/components/Tickets/TicketPurchaseForm';
import QueueStats from '@/components/Queue/QueueStats';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import ErrorMessage from '@/components/UI/ErrorMessage';
import LiveIndicator from '@/components/UI/LiveIndicator';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const toast = useToast();

  const {
    event,
    loading,
    error,
    isPolling,
    lastUpdate,
    hasRecentChanges,
    forceRefresh,
    startPolling,
    stopPolling,
  } = useEventDetailsUpdates(eventId, {
    pollInterval: 3000,
    immediate: true,
    stopOnError: false,
  });

  // Show toast notification when ticket availability changes
  React.useEffect(() => {
    if (hasRecentChanges && !loading && event) {
      toast({
        title: 'Event Updated',
        description: 'Ticket availability has changed!',
        status: 'info',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    }
  }, [hasRecentChanges, loading, event, toast]);

  const handlePurchaseSuccess = () => {
    // Force refresh to get the latest data immediately after purchase
    // forceRefresh();
  };

  if (loading && !event) {
    return <LoadingSpinner message="Loading event details..." />;
  }

  if (error && !event) {
    return (
      <VStack spacing={4}>
        <ErrorMessage message={error} onRetry={forceRefresh} />
        <Button
          leftIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
          variant="outline"
        >
          Back to Events
        </Button>
      </VStack>
    );
  }

  if (!event) {
    return (
      <VStack spacing={4}>
        <ErrorMessage message="Event not found" />
        <Button
          leftIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
          variant="outline"
        >
          Back to Events
        </Button>
      </VStack>
    );
  }

  const eventWithComputed = addComputedProperties(event);

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="center" wrap="wrap">
          <Button
            leftIcon={<ArrowBackIcon />}
            onClick={() => router.push('/')}
            variant="ghost"
            size="sm"
          >
            Back to Events
          </Button>

          <HStack spacing={2}>
            <LiveIndicator
              isLive={isPolling}
              lastUpdate={lastUpdate}
              hasRecentChanges={hasRecentChanges}
              error={error}
              size="sm"
              showTimestamp={false}
              showText={true}
            />
            
            <Button
              size="sm"
              variant="outline"
              onClick={forceRefresh}
              isLoading={loading}
              loadingText="Refreshing"
            >
              Refresh
            </Button>
            
            <Button
              size="sm"
              variant={isPolling ? 'solid' : 'outline'}
              colorScheme={isPolling ? 'red' : 'green'}
              onClick={isPolling ? stopPolling : startPolling}
            >
              {isPolling ? 'Pause' : 'Resume'}
            </Button>
          </HStack>
        </HStack>

        {/* Show connection error banner if polling fails but we have cached data */}
        {error && event && (
          <ErrorMessage 
            message={`Connection issue: ${error}. Showing cached data.`}
            onRetry={forceRefresh}
            variant="warning"
          />
        )}

        <VStack spacing={2} align="flex-start">
          <HStack spacing={4} wrap="wrap">
            <Heading size="xl">{event.name}</Heading>
            <Badge 
              colorScheme={eventWithComputed.isSoldOut ? 'red' : eventWithComputed.isUpcoming ? 'green' : 'gray'}
              fontSize="md"
              px={3}
              py={1}
            >
              {eventWithComputed.isSoldOut ? 'Sold Out' : eventWithComputed.isUpcoming ? 'Available' : 'Past Event'}
            </Badge>
            {hasRecentChanges && (
              <Badge colorScheme="orange" fontSize="sm" px={2} py={1}>
                Updated
              </Badge>
            )}
          </HStack>

          <HStack color="gray.600">
            <CalendarIcon />
            <Text fontSize="lg">{formatDate(event.date)}</Text>
          </HStack>
        </VStack>
      </VStack>

      {/* Event Details, Queue Stats, and Purchase Form */}
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
        <GridItem>
          {/* Event Information */}
          <Card>
            <CardHeader>
              <Heading size="md">Event Details</Heading>
            </CardHeader>
            
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="semibold">Event Name:</Text>
                  <Text>{event.name}</Text>
                </HStack>

                <Divider />

                <HStack justify="space-between">
                  <Text fontWeight="semibold">Date & Time:</Text>
                  <Text>{formatDate(event.date)}</Text>
                </HStack>

                <Divider />

                <HStack justify="space-between">
                  <Text fontWeight="semibold">Total Tickets:</Text>
                  <Text fontWeight="bold">{event.total_tickets}</Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="semibold">Available:</Text>
                  <HStack spacing={2}>
                    <Text 
                      fontWeight="bold" 
                      color={eventWithComputed.isSoldOut ? 'red.500' : 'green.500'}
                      transition="all 0.3s ease"
                      transform={hasRecentChanges ? 'scale(1.1)' : 'scale(1)'}
                    >
                      {event.available_tickets}
                    </Text>
                    {hasRecentChanges && (
                      <Badge colorScheme="orange" size="sm">
                        Updated
                      </Badge>
                    )}
                  </HStack>
                </HStack>

                <HStack justify="space-between">
                  <Text fontWeight="semibold">Sold:</Text>
                  <Text fontWeight="bold">{eventWithComputed.soldTickets}</Text>
                </HStack>

                <Divider />

                <HStack justify="space-between">
                  <Text fontWeight="semibold">Status:</Text>
                  <Badge 
                    colorScheme={eventWithComputed.isSoldOut ? 'red' : eventWithComputed.isUpcoming ? 'green' : 'gray'}
                  >
                    {eventWithComputed.isSoldOut 
                      ? 'Sold Out' 
                      : eventWithComputed.isUpcoming 
                        ? 'Available for Purchase' 
                        : 'Event Ended'}
                  </Badge>
                </HStack>

                {!eventWithComputed.isUpcoming && (
                  <Text fontSize="sm" color="gray.600" fontStyle="italic">
                    This event has already taken place.
                  </Text>
                )}

                {/* Queue Information for upcoming events with some tickets sold */}
                {eventWithComputed.isUpcoming && eventWithComputed.soldTickets > 0 && (
                  <VStack spacing={2} align="stretch">
                    <Divider />
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      Fair Purchase Queue
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      All purchases are processed through a fair queueing system to ensure everyone gets an equal chance.
                    </Text>
                  </VStack>
                )}
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <VStack spacing={6} align="stretch">
            {/* Queue Statistics */}
            {eventWithComputed.isUpcoming && (
              <QueueStats 
                eventId={event.id} 
                compact={false}
                showTitle={true}
              />
            )}

            {/* Purchase Form */}
            <TicketPurchaseForm 
              event={event} 
              onPurchaseSuccess={handlePurchaseSuccess}
            />
          </VStack>
        </GridItem>
      </Grid>
    </VStack>
  );
}
'use client';

import { useState, useEffect } from 'react';
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
import { apiClient, formatDate, addComputedProperties } from '@/lib/api';
import { Event } from '@/types/api';
import TicketPurchaseForm from '@/components/Tickets/TicketPurchaseForm';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import ErrorMessage from '@/components/UI/ErrorMessage';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const toast = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEvent(eventId);
      setEvent(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch event details';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSuccess = () => {
    // Refresh event data to update available tickets
    fetchEvent();
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  if (loading) {
    return <LoadingSpinner message="Loading event details..." />;
  }

  if (error) {
    return (
      <VStack spacing={4}>
        <ErrorMessage message={error} onRetry={fetchEvent} />
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
        <Button
          leftIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
          variant="ghost"
          alignSelf="flex-start"
          size="sm"
        >
          Back to Events
        </Button>

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
          </HStack>

          <HStack color="gray.600">
            <CalendarIcon />
            <Text fontSize="lg">{formatDate(event.date)}</Text>
          </HStack>
        </VStack>
      </VStack>

      {/* Event Details and Purchase Form */}
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
                  <Text 
                    fontWeight="bold" 
                    color={eventWithComputed.isSoldOut ? 'red.500' : 'green.500'}
                  >
                    {event.available_tickets}
                  </Text>
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
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          {/* Purchase Form */}
          <TicketPurchaseForm 
            event={event} 
            onPurchaseSuccess={handlePurchaseSuccess}
          />
        </GridItem>
      </Grid>
    </VStack>
  );
}
'use client';

import { useState, useEffect } from 'react';
import {
  VStack,
  Heading,
  Text,
  Button,
  useToast,
} from '@chakra-ui/react';
import { apiClient } from '@/lib/api';
import { Event } from '@/types/api';
import EventList from '@/components/Events/EventList';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import ErrorMessage from '@/components/UI/ErrorMessage';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEvents('date');
      setEvents(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
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

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchEvents} />;
  }

  return (
    <VStack spacing={8} align="stretch">
      <VStack spacing={4} textAlign="center">
        <Heading size="xl" color="brand.700">
          Welcome to WeOn
        </Heading>
        <Text color="gray.600" fontSize="lg">
          Discover and purchase tickets for amazing events
        </Text>
      </VStack>

      <EventList events={events} />
    </VStack>
  );
}
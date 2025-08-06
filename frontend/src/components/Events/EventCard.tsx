'use client';

import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  HStack,
  VStack,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { CalendarIcon, TimeIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { Event } from '@/types/api';
import { formatDate, addComputedProperties } from '@/lib/api';
import { CompactLiveIndicator } from '@/components/UI/LiveIndicator';

interface EventCardProps {
  event: Event;
  /** Whether this event has recent changes (from real-time updates) */
  hasRecentChanges?: boolean;
  /** Whether live updates are active */
  isLive?: boolean;
  /** Last update timestamp */
  lastUpdate?: Date | null;
  /** Connection error if any */
  error?: string | null;
}

export default function EventCard({ 
  event, 
  hasRecentChanges = false,
  isLive = false,
  lastUpdate,
  error
}: EventCardProps) {
  const eventWithComputed = addComputedProperties(event);
  const cardBg = useColorModeValue('white', 'gray.800');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Card 
      bg={cardBg} 
      transition="all 0.3s ease" 
      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
      borderWidth={hasRecentChanges ? '2px' : '1px'}
      borderColor={hasRecentChanges ? 'orange.300' : 'gray.200'}
      position="relative"
    >
      <CardHeader pb={2}>
        <VStack align="flex-start" spacing={2}>
          <HStack justify="space-between" w="full">
            <Heading size="md" noOfLines={2}>
              {event.name}
            </Heading>
            <VStack spacing={1} align="flex-end">
              <HStack spacing={2}>
                {isLive && (
                  <CompactLiveIndicator
                    isLive={isLive}
                    hasRecentChanges={hasRecentChanges}
                    lastUpdate={lastUpdate}
                    error={error}
                    size="sm"
                    showTooltip={true}
                  />
                )}
                <Badge 
                  colorScheme={eventWithComputed.isSoldOut ? 'red' : eventWithComputed.isUpcoming ? 'green' : 'gray'}
                >
                  {eventWithComputed.isSoldOut ? 'Sold Out' : eventWithComputed.isUpcoming ? 'Available' : 'Past Event'}
                </Badge>
              </HStack>
              {hasRecentChanges && (
                <Badge colorScheme="orange" size="sm" fontSize="xs">
                  Updated
                </Badge>
              )}
            </VStack>
          </HStack>
          
          <HStack color={mutedColor} fontSize="sm">
            <CalendarIcon />
            <Text>{formatDate(event.date)}</Text>
          </HStack>
        </VStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between" fontSize="sm">
            <Text color={mutedColor}>Available Tickets:</Text>
            <HStack spacing={2}>
              <Text 
                fontWeight="semibold" 
                color={eventWithComputed.isSoldOut ? 'red.500' : 'green.500'}
                transition="all 0.3s ease"
                transform={hasRecentChanges ? 'scale(1.05)' : 'scale(1)'}
              >
                {event.available_tickets} / {event.total_tickets}
              </Text>
              {hasRecentChanges && (
                <Badge colorScheme="orange" size="xs">
                  New
                </Badge>
              )}
            </HStack>
          </HStack>

          {eventWithComputed.soldTickets > 0 && (
            <HStack justify="space-between" fontSize="sm">
              <Text color={mutedColor}>Sold:</Text>
              <Text fontWeight="semibold">{eventWithComputed.soldTickets}</Text>
            </HStack>
          )}

          <Button
            as={Link}
            href={`/events/${event.id}`}
            colorScheme="brand"
            size="sm"
            isDisabled={eventWithComputed.isSoldOut || !eventWithComputed.isUpcoming}
            w="full"
          >
            {eventWithComputed.isSoldOut 
              ? 'Sold Out' 
              : !eventWithComputed.isUpcoming 
                ? 'Event Passed' 
                : 'View Details'}
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
}
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

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const eventWithComputed = addComputedProperties(event);
  const cardBg = useColorModeValue('white', 'gray.800');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Card bg={cardBg} transition="all 0.2s" _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}>
      <CardHeader pb={2}>
        <VStack align="flex-start" spacing={2}>
          <HStack justify="space-between" w="full">
            <Heading size="md" noOfLines={2}>
              {event.name}
            </Heading>
            <Badge 
              colorScheme={eventWithComputed.isSoldOut ? 'red' : eventWithComputed.isUpcoming ? 'green' : 'gray'}
            >
              {eventWithComputed.isSoldOut ? 'Sold Out' : eventWithComputed.isUpcoming ? 'Available' : 'Past Event'}
            </Badge>
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
            <Text fontWeight="semibold" color={eventWithComputed.isSoldOut ? 'red.500' : 'green.500'}>
              {event.available_tickets} / {event.total_tickets}
            </Text>
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
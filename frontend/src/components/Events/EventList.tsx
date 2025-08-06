'use client';

import {
  VStack,
  HStack,
  Select,
  Button,
  ButtonGroup,
  SimpleGrid,
  Text,
  Box,
  InputGroup,
  InputLeftElement,
  Input,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/types/api';
import { addComputedProperties } from '@/lib/api';
import EventCard from './EventCard';
import EmptyState from '@/components/UI/EmptyState';

interface EventListProps {
  events: Event[];
  /** Whether live updates are active */
  isLive?: boolean;
  /** Last update timestamp */
  lastUpdate?: Date | null;
  /** Set of event IDs that have recent changes */
  changedEvents?: Set<string>;
  /** Connection error if any */
  error?: string | null;
}

type FilterType = 'all' | 'upcoming' | 'available' | 'past';
type SortType = 'date' | 'created_at' | 'name';

export default function EventList({ 
  events, 
  isLive = false,
  lastUpdate,
  changedEvents = new Set(),
  error
}: EventListProps) {
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [sort, setSort] = useState<SortType>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const filteredAndSortedEvents = useMemo(() => {
    let filtered = events.map(addComputedProperties);

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(event => event.isUpcoming);
        break;
      case 'available':
        filtered = filtered.filter(event => event.isUpcoming && !event.isSoldOut);
        break;
      case 'past':
        filtered = filtered.filter(event => !event.isUpcoming);
        break;
      default:
        // 'all' - no filtering
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, filter, sort, searchTerm]);

  return (
    <VStack spacing={6} align="stretch">
      {/* Filters and Search */}
      <VStack spacing={4} align="stretch">
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            bg="white"
          />
        </InputGroup>

        <HStack justify="space-between" wrap="wrap" spacing={4}>
          <ButtonGroup size="sm" isAttached>
            <Button
              variant={filter === 'all' ? 'solid' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All Events
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'solid' : 'outline'}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === 'available' ? 'solid' : 'outline'}
              onClick={() => setFilter('available')}
            >
              Available
            </Button>
            <Button
              variant={filter === 'past' ? 'solid' : 'outline'}
              onClick={() => setFilter('past')}
            >
              Past Events
            </Button>
          </ButtonGroup>

          <Select 
            size="sm" 
            value={sort} 
            onChange={(e) => setSort(e.target.value as SortType)}
            w="auto"
            bg="white"
          >
            <option value="date">Sort by Date</option>
            <option value="created_at">Sort by Created</option>
            <option value="name">Sort by Name</option>
          </Select>
        </HStack>
      </VStack>

      {/* Results */}
      {filteredAndSortedEvents.length === 0 ? (
        <EmptyState
          title={searchTerm ? "No events found" : events.length === 0 ? "No events yet" : "No events match your filter"}
          description={
            searchTerm 
              ? `No events found matching "${searchTerm}". Try adjusting your search terms.`
              : events.length === 0
                ? "Get started by creating your first event. Click the button below to begin."
                : "Try changing your filter options to see more events."
          }
          actionLabel={events.length === 0 ? "Create First Event" : undefined}
          onAction={events.length === 0 ? () => router.push('/admin') : undefined}
        />
      ) : (
        <>
          <Text color="gray.600" fontSize="sm">
            Showing {filteredAndSortedEvents.length} of {events.length} events
          </Text>
          
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filteredAndSortedEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event}
                isLive={isLive}
                lastUpdate={lastUpdate}
                hasRecentChanges={changedEvents.has(event.id)}
                error={error}
              />
            ))}
          </SimpleGrid>
        </>
      )}
    </VStack>
  );
}
'use client';

import {
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  Progress,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FiUsers, FiClock, FiActivity, FiTrendingUp } from 'react-icons/fi';
import { apiClient, formatWaitTime } from '@/lib/api';
import { QueueStats as QueueStatsType } from '@/types/queue';

interface QueueStatsProps {
  eventId: string;
  compact?: boolean;
  refreshInterval?: number; // in milliseconds
  showTitle?: boolean;
}

export default function QueueStats({ 
  eventId, 
  compact = false, 
  refreshInterval = 5000,
  showTitle = true 
}: QueueStatsProps) {
  const [stats, setStats] = useState<QueueStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await apiClient.getQueueStats(eventId);
      setStats(data);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch queue stats';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up polling for queue stats
    const interval = setInterval(fetchStats, refreshInterval);

    return () => clearInterval(interval);
  }, [eventId, refreshInterval]);

  if (loading && !stats) {
    return (
      <Card size={compact ? 'sm' : 'md'}>
        <CardBody>
          <HStack spacing={3}>
            <Spinner size="sm" />
            <Text fontSize={compact ? 'sm' : 'md'}>Loading queue statistics...</Text>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  if (error && !stats) {
    return (
      <Card size={compact ? 'sm' : 'md'}>
        <CardBody>
          <Alert status="warning" size={compact ? 'sm' : 'md'}>
            <AlertIcon />
            <Text fontSize={compact ? 'sm' : 'md'}>Unable to load queue statistics</Text>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const hasActiveQueue = stats.total_active > 0;
  const processingRate = stats.processing + stats.waiting > 0 ? 
    (stats.processing / (stats.processing + stats.waiting)) * 100 : 0;

  if (compact) {
    return (
      <Card size="sm">
        <CardBody>
          <VStack spacing={2} align="stretch">
            {showTitle && (
              <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                Purchase Queue
              </Text>
            )}
            
            {hasActiveQueue ? (
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <HStack spacing={1}>
                    <Icon as={FiUsers} size="sm" />
                    <Text fontSize="sm">Waiting:</Text>
                  </HStack>
                  <Badge colorScheme="blue" size="sm">
                    {stats.waiting}
                  </Badge>
                </HStack>
                
                {stats.processing > 0 && (
                  <HStack justify="space-between">
                    <HStack spacing={1}>
                      <Icon as={FiActivity} size="sm" />
                      <Text fontSize="sm">Processing:</Text>
                    </HStack>
                    <Badge colorScheme="orange" size="sm">
                      {stats.processing}
                    </Badge>
                  </HStack>
                )}

                {stats.waiting > 0 && (
                  <Text fontSize="xs" color="gray.600" textAlign="center">
                    Est. wait: {formatWaitTime(stats.waiting * 10)} {/* rough estimate */}
                  </Text>
                )}
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.600" textAlign="center">
                No active queue
              </Text>
            )}
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <HStack justify="space-between" align="center">
            <Heading size="md">Purchase Queue Status</Heading>
            {loading && <Spinner size="sm" />}
          </HStack>
        </CardHeader>
      )}
      
      <CardBody>
        <VStack spacing={4} align="stretch">
          {hasActiveQueue ? (
            <>
              {/* Active Queue Stats */}
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>
                    <HStack spacing={1}>
                      <Icon as={FiUsers} />
                      <Text>Waiting</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber color="blue.600">{stats.waiting}</StatNumber>
                  <StatHelpText>
                    {stats.waiting === 1 ? 'person' : 'people'} in queue
                  </StatHelpText>
                </Stat>

                <Stat>
                  <StatLabel>
                    <HStack spacing={1}>
                      <Icon as={FiActivity} />
                      <Text>Processing</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber color="orange.600">{stats.processing}</StatNumber>
                  <StatHelpText>Currently purchasing</StatHelpText>
                </Stat>

                <Stat>
                  <StatLabel>
                    <HStack spacing={1}>
                      <Icon as={FiTrendingUp} />
                      <Text>Completed</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber color="green.600">{stats.completed}</StatNumber>
                  <StatHelpText>Successful purchases</StatHelpText>
                </Stat>

                <Stat>
                  <StatLabel>
                    <HStack spacing={1}>
                      <Icon as={FiClock} />
                      <Text>Est. Wait</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber fontSize="lg" color="purple.600">
                    {formatWaitTime(stats.waiting * 10)} {/* rough estimate */}
                  </StatNumber>
                  <StatHelpText>For new requests</StatHelpText>
                </Stat>
              </SimpleGrid>

              {/* Queue Activity Progress */}
              {stats.total_active > 0 && (
                <VStack spacing={2} align="stretch">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    Queue Activity
                  </Text>
                  <Progress 
                    value={processingRate} 
                    colorScheme="orange" 
                    size="sm"
                    hasStripe
                    isAnimated
                  />
                  <HStack justify="space-between" fontSize="xs" color="gray.600">
                    <Text>{stats.waiting} waiting</Text>
                    <Text>{stats.processing} processing</Text>
                  </HStack>
                </VStack>
              )}

              {/* Additional Stats */}
              {(stats.failed > 0 || stats.expired > 0) && (
                <SimpleGrid columns={2} spacing={4}>
                  {stats.failed > 0 && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Failed:</Text>
                      <Badge colorScheme="red">{stats.failed}</Badge>
                    </HStack>
                  )}
                  {stats.expired > 0 && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Expired:</Text>
                      <Badge colorScheme="gray">{stats.expired}</Badge>
                    </HStack>
                  )}
                </SimpleGrid>
              )}
            </>
          ) : (
            <Alert status="info">
              <AlertIcon />
              <VStack align="start" flex={1}>
                <Text fontWeight="semibold">No Active Queue</Text>
                <Text fontSize="sm">
                  Purchases will be processed immediately when tickets become available.
                </Text>
              </VStack>
            </Alert>
          )}

          {/* Last Update Info */}
          {lastUpdate && (
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
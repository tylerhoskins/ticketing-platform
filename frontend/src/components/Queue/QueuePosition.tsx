'use client';

import {
  VStack,
  HStack,
  Box,
  Text,
  Progress,
  Button,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Badge,
  Spinner,
  Icon,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState, useRef } from 'react';
import { FiClock, FiUsers, FiX } from 'react-icons/fi';
import { useQueueStatus } from '@/hooks/useQueueStatus';
import { formatWaitTime, getUserSessionId } from '@/lib/api';
import { PurchaseIntentStatus } from '@/types/queue';

interface QueuePositionProps {
  intentId: string;
  onCompleted?: (success: boolean, purchaseId?: string) => void;
  onCancelled?: () => void;
  showCancelButton?: boolean;
  compact?: boolean;
}

export default function QueuePosition({ 
  intentId, 
  onCompleted, 
  onCancelled,
  showCancelButton = true,
  compact = false
}: QueuePositionProps) {
  const toast = useToast();
  const [userSessionId] = useState(() => getUserSessionId());
  
  // Track which completions we've already processed to prevent duplicate toasts
  const processedCompletions = useRef(new Set<string>());
  
  const {
    status,
    loading,
    error,
    isActive,
    isCompleted,
    isPolling,
    position,
    estimatedWait,
    cancelIntent,
    refresh,
    lastUpdate,
  } = useQueueStatus(intentId, {
    pollInterval: 2000,
    autoStop: true,
    onCompleted: (status) => {
      // Create a unique key for this completion event
      const completionKey = `${intentId}-${status.status}-${status.purchase_result?.purchase_id || 'no-id'}`;
      
      // Check if we've already processed this completion
      if (processedCompletions.current.has(completionKey)) {
        console.log('[QueuePosition] Completion already processed, skipping:', completionKey);
        return;
      }
      
      // Mark this completion as processed
      processedCompletions.current.add(completionKey);
      console.log('[QueuePosition] Processing completion:', completionKey);
      
      if (status.purchase_result?.success && status.purchase_result.purchase_id) {
        toast({
          title: 'Purchase Successful!',
          description: `Successfully purchased ${status.purchase_result.tickets_purchased} ticket${status.purchase_result.tickets_purchased !== 1 ? 's' : ''}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onCompleted?.(true, status.purchase_result.purchase_id);
      } else {
        toast({
          title: 'Purchase Failed',
          description: status.purchase_result?.message || 'Purchase could not be completed',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        onCompleted?.(false);
      }
    },
    onFailed: (status) => {
      // Create a unique key for this failure event
      const failureKey = `${intentId}-${status.status}-failed`;
      
      // Check if we've already processed this failure
      if (processedCompletions.current.has(failureKey)) {
        console.log('[QueuePosition] Failure already processed, skipping:', failureKey);
        return;
      }
      
      // Mark this failure as processed
      processedCompletions.current.add(failureKey);
      console.log('[QueuePosition] Processing failure:', failureKey);
      
      toast({
        title: 'Purchase Failed',
        description: status.purchase_result?.message || 'Purchase failed',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      onCompleted?.(false);
    },
  });

  // Clear processed completions when intentId changes (new purchase attempt)
  useEffect(() => {
    processedCompletions.current.clear();
    console.log('[QueuePosition] Cleared processed completions for new intent:', intentId);
  }, [intentId]);

  const handleCancel = async () => {
    try {
      await cancelIntent(userSessionId);
      toast({
        title: 'Purchase Cancelled',
        description: 'Your purchase request has been cancelled',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      onCancelled?.();
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel purchase',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status?: PurchaseIntentStatus) => {
    switch (status) {
      case PurchaseIntentStatus.WAITING:
        return 'blue';
      case PurchaseIntentStatus.PROCESSING:
        return 'orange';
      case PurchaseIntentStatus.COMPLETED:
        return 'green';
      case PurchaseIntentStatus.FAILED:
        return 'red';
      case PurchaseIntentStatus.EXPIRED:
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status?: PurchaseIntentStatus) => {
    switch (status) {
      case PurchaseIntentStatus.WAITING:
        return 'Waiting in queue';
      case PurchaseIntentStatus.PROCESSING:
        return 'Processing purchase';
      case PurchaseIntentStatus.COMPLETED:
        return 'Purchase completed';
      case PurchaseIntentStatus.FAILED:
        return 'Purchase failed';
      case PurchaseIntentStatus.EXPIRED:
        return 'Request expired';
      default:
        return 'Unknown status';
    }
  };

  const calculateProgress = () => {
    if (!position || !status) return 0;
    
    // If we don't have queue statistics, use a simple heuristic
    // Assume the queue started with position * 2 (rough estimate)
    const estimatedStartingPosition = position * 2;
    const progress = ((estimatedStartingPosition - position) / estimatedStartingPosition) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  if (!status && loading) {
    return (
      <Card size={compact ? 'sm' : 'md'}>
        <CardBody>
          <HStack spacing={3}>
            <Spinner size="sm" />
            <Text>Loading queue status...</Text>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  if (error && !status) {
    return (
      <Card size={compact ? 'sm' : 'md'}>
        <CardBody>
          <Alert status="error" size={compact ? 'sm' : 'md'}>
            <AlertIcon />
            <VStack align="start" spacing={2} flex={1}>
              <Text fontSize={compact ? 'sm' : 'md'}>Failed to load queue status</Text>
              {!compact && (
                <Button size="sm" onClick={refresh} isLoading={loading}>
                  Retry
                </Button>
              )}
            </VStack>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <Card size={compact ? 'sm' : 'md'}>
      <CardBody>
        <VStack spacing={compact ? 3 : 4} align="stretch">
          {/* Status Header */}
          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              {loading && <Spinner size="xs" />}
              <Badge 
                colorScheme={getStatusColor(status.status)}
                variant="solid"
                fontSize={compact ? 'xs' : 'sm'}
              >
                {getStatusText(status.status)}
              </Badge>
            </HStack>
            {showCancelButton && isActive && (
              <Button
                size={compact ? 'xs' : 'sm'}
                variant="ghost"
                colorScheme="red"
                leftIcon={<FiX />}
                onClick={handleCancel}
                isLoading={loading}
              >
                Cancel
              </Button>
            )}
          </HStack>

          {/* Queue Position Info */}
          {isActive && (
            <VStack spacing={compact ? 2 : 3} align="stretch">
              {position && (
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <HStack spacing={1}>
                      <Icon as={FiUsers} />
                      <Text fontSize={compact ? 'sm' : 'md'} fontWeight="semibold">
                        Queue Position
                      </Text>
                    </HStack>
                    <Text fontSize={compact ? 'lg' : 'xl'} fontWeight="bold" color="brand.600">
                      #{position}
                    </Text>
                  </HStack>
                  
                  {!compact && (
                    <Progress
                      value={calculateProgress()}
                      colorScheme="brand"
                      size="sm"
                      hasStripe
                      isAnimated
                    />
                  )}
                </Box>
              )}

              {estimatedWait && estimatedWait > 0 && (
                <HStack justify="space-between">
                  <HStack spacing={1}>
                    <Icon as={FiClock} />
                    <Text fontSize={compact ? 'sm' : 'md'} fontWeight="semibold">
                      Estimated Wait
                    </Text>
                  </HStack>
                  <Text fontSize={compact ? 'sm' : 'md'} color="gray.600">
                    {formatWaitTime(estimatedWait)}
                  </Text>
                </HStack>
              )}

              {/* Event Details */}
              {status.event && !compact && (
                <Box pt={2} borderTop="1px" borderColor="gray.200">
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {status.event.name}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {status.requested_quantity} ticket{status.requested_quantity !== 1 ? 's' : ''} requested
                      </Text>
                    </VStack>
                    <Text fontSize="xs" color="gray.500">
                      {status.event.available_tickets} available
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>
          )}

          {/* Completion Status */}
          {isCompleted && (
            <Alert 
              status={status.status === PurchaseIntentStatus.COMPLETED ? 'success' : 'error'}
              size={compact ? 'sm' : 'md'}
            >
              <AlertIcon />
              <VStack align="start" spacing={1} flex={1}>
                <Text fontSize={compact ? 'sm' : 'md'} fontWeight="semibold">
                  {status.status === PurchaseIntentStatus.COMPLETED 
                    ? 'Purchase Successful!' 
                    : 'Purchase Failed'
                  }
                </Text>
                {status.purchase_result?.message && (
                  <Text fontSize={compact ? 'xs' : 'sm'}>
                    {status.purchase_result.message}
                  </Text>
                )}
              </VStack>
            </Alert>
          )}

          {/* Last Update Info */}
          {!compact && lastUpdate && isPolling && (
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Badge,
  SimpleGrid,
  Box,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react';
import { ArrowBackIcon, CheckCircleIcon, CalendarIcon } from '@chakra-ui/icons';
import { apiClient, formatDate } from '@/lib/api';
import { PurchaseSummary } from '@/types/api';
import { IntentCompletion, PurchaseIntentStatus } from '@/types/queue';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import ErrorMessage from '@/components/UI/ErrorMessage';
import QueuePosition from '@/components/Queue/QueuePosition';

export default function PurchaseConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.purchaseId as string;
  const toast = useToast();

  const [purchase, setPurchase] = useState<PurchaseSummary | null>(null);
  const [intentCompletion, setIntentCompletion] = useState<IntentCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIntent, setIsIntent] = useState<boolean>(false);

  const fetchPurchase = async () => {
    if (!purchaseId) return;

    try {
      setLoading(true);
      setError(null);
      
      // First, try to determine if this is an intent ID or purchase ID
      // Intent IDs are typically UUIDs, purchase IDs might be different format
      // We'll try intent completion first, if it fails, try purchase summary
      try {
        const intentData = await apiClient.checkIntentCompletion(purchaseId);
        setIntentCompletion(intentData);
        setIsIntent(true);
        
        // If intent is completed successfully, also try to get the actual purchase data
        if (intentData.status === PurchaseIntentStatus.COMPLETED && intentData.purchase_id) {
          try {
            const purchaseData = await apiClient.getPurchaseSummary(intentData.purchase_id);
            setPurchase(purchaseData);
          } catch {
            // If purchase data is not available yet, that's ok
            console.log('Purchase data not yet available for intent completion');
          }
        }
      } catch (intentError) {
        // If intent completion fails, try regular purchase summary
        try {
          const purchaseData = await apiClient.getPurchaseSummary(purchaseId);
          setPurchase(purchaseData);
          setIsIntent(false);
        } catch (purchaseError) {
          // Neither worked, this ID is invalid
          throw new Error('Invalid purchase or intent ID');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch purchase details';
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

  const handleQueueCompleted = (success: boolean, newPurchaseId?: string) => {
    if (success && newPurchaseId) {
      // Refresh the page data to show the completed purchase
      fetchPurchase();
    }
  };

  useEffect(() => {
      fetchPurchase();
  }, [purchaseId]);

  if (loading) {
    return <LoadingSpinner message="Loading purchase details..." />;
  }

  if (error) {
    return (
      <VStack spacing={4}>
        <ErrorMessage message={error} onRetry={fetchPurchase} />
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

  if (!purchase && !intentCompletion) {
    return (
      <VStack spacing={4}>
        <ErrorMessage message={isIntent ? "Intent not found" : "Purchase not found"} />
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

  // If this is an intent that's not yet completed, show the queue status
  if (isIntent && intentCompletion) {
    if (intentCompletion.status === PurchaseIntentStatus.WAITING || intentCompletion.status === PurchaseIntentStatus.PROCESSING) {
      return (
        <VStack spacing={8} align="stretch">
          <VStack spacing={4}>
            <Heading size="xl" textAlign="center">
              Purchase in Progress
            </Heading>
            <Text color="gray.600" textAlign="center" fontSize="lg">
              Your purchase request is being processed
            </Text>
          </VStack>

          {/* <QueuePosition
            intentId={purchaseId}
            onCompleted={handleQueueCompleted}
            onCancelled={() => router.push('/')}
          /> */}

          <VStack spacing={4}>
            <Button
              leftIcon={<ArrowBackIcon />}
              onClick={() => router.push('/')}
              variant="outline"
            >
              Back to Events
            </Button>
          </VStack>
        </VStack>
      );
    }

    // Intent failed or expired
    if (intentCompletion.status === PurchaseIntentStatus.FAILED || intentCompletion.status === PurchaseIntentStatus.EXPIRED) {
      return (
        <VStack spacing={8} align="stretch">
          <VStack spacing={4}>
            <CheckCircleIcon color="red.500" boxSize={16} />
            <Heading size="xl" color="red.600" textAlign="center">
              Purchase {intentCompletion.status === PurchaseIntentStatus.FAILED ? 'Failed' : 'Expired'}
            </Heading>
            <Text color="gray.600" textAlign="center" fontSize="lg">
              {intentCompletion.message || 'Your purchase request could not be completed'}
            </Text>
          </VStack>

          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="semibold">
                {intentCompletion.status === PurchaseIntentStatus.FAILED ? 'Purchase Failed' : 'Request Expired'}
              </Text>
              <Text fontSize="sm">
                {intentCompletion.status === PurchaseIntentStatus.FAILED 
                  ? 'The tickets may no longer be available or there was a processing error.'
                  : 'Your purchase request was not processed within the allowed time limit.'
                }
              </Text>
            </Box>
          </Alert>

          {intentCompletion.event && (
            <Card>
              <CardHeader>
                <Heading size="md">Event Details</Heading>
              </CardHeader>
              
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <VStack spacing={2} align="flex-start">
                    <Heading size="lg" color="brand.600">
                      {intentCompletion.event.name}
                    </Heading>
                    
                    <HStack color="gray.600">
                      <CalendarIcon />
                      <Text fontSize="lg">{formatDate(intentCompletion.event.date)}</Text>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          )}

          <HStack spacing={4} justify="center" wrap="wrap">
            <Button
              leftIcon={<ArrowBackIcon />}
              onClick={() => router.push('/')}
              variant="outline"
              size="lg"
            >
              Browse Events
            </Button>
            
            {intentCompletion.event && (
              <Button
                onClick={() => router.push(`/events/${intentCompletion.event!.id}`)}
                colorScheme="brand"
                size="lg"
              >
                Try Again
              </Button>
            )}
          </HStack>
        </VStack>
      );
    }
  }

  // Show completed purchase (either direct purchase or completed intent)
  if (!purchase) {
    return (
      <VStack spacing={4}>
        <ErrorMessage message="Purchase details not available" />
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

  return (
    <VStack spacing={8} align="stretch">
      {/* Success Header */}
      <VStack spacing={4}>
        <CheckCircleIcon color="green.500" boxSize={16} />
        <Heading size="xl" color="green.600" textAlign="center">
          Purchase Successful!
        </Heading>
        <Text color="gray.600" textAlign="center" fontSize="lg">
          Your tickets have been confirmed
          {isIntent && ' (processed through queue)'}
        </Text>
      </VStack>

      {/* Purchase Summary */}
      <Card>
        <CardHeader>
          <Heading size="md">Purchase Summary</Heading>
        </CardHeader>
        
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="semibold">Purchase ID:</Text>
              <Text fontFamily="mono" fontSize="sm" color="gray.600">
                {purchase.purchase_id}
              </Text>
            </HStack>
            
            {isIntent && intentCompletion && (
              <>
                <HStack justify="space-between">
                  <Text fontWeight="semibold">Intent ID:</Text>
                  <Text fontFamily="mono" fontSize="sm" color="gray.600">
                    {purchaseId}
                  </Text>
                </HStack>
                
                {intentCompletion.processing_time && (
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Processing Time:</Text>
                    <Text fontSize="sm" color="gray.600">
                      {Math.round(intentCompletion.processing_time / 1000)} seconds
                    </Text>
                  </HStack>
                )}
              </>
            )}

            <Divider />

            <HStack justify="space-between">
              <Text fontWeight="semibold">Purchase Date:</Text>
              <Text>{formatDate(purchase.purchased_at)}</Text>
            </HStack>

            <HStack justify="space-between">
              <Text fontWeight="semibold">Total Tickets:</Text>
              <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                {purchase.total_tickets}
              </Badge>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <Heading size="md">Event Details</Heading>
        </CardHeader>
        
        <CardBody>
          <VStack spacing={4} align="stretch">
            <VStack spacing={2} align="flex-start">
              <Heading size="lg" color="brand.600">
                {purchase.event.name}
              </Heading>
              
              <HStack color="gray.600">
                <CalendarIcon />
                <Text fontSize="lg">{formatDate(purchase.event.date)}</Text>
              </HStack>
            </VStack>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontWeight="semibold">Important Information:</Text>
                <Text fontSize="sm">
                  Please save this confirmation page or take a screenshot. 
                  You may need to present this information at the event venue.
                </Text>
              </Box>
            </Alert>
          </VStack>
        </CardBody>
      </Card>

      {/* Individual Tickets */}
      <Card>
        <CardHeader>
          <Heading size="md">Your Tickets</Heading>
        </CardHeader>
        
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {purchase.tickets.map((ticket, index) => (
              <Card key={ticket.id} variant="outline" bg="gray.50">
                <CardBody>
                  <VStack align="flex-start" spacing={2}>
                    <HStack justify="space-between" w="full">
                      <Text fontWeight="semibold">Ticket #{index + 1}</Text>
                      <Badge colorScheme="brand">Valid</Badge>
                    </HStack>
                    
                    <Text fontSize="sm" color="gray.600" fontFamily="mono">
                      {ticket.id}
                    </Text>
                    
                    <Text fontSize="sm" color="gray.600">
                      Purchased: {formatDate(ticket.purchased_at)}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Action Buttons */}
      <HStack spacing={4} justify="center" wrap="wrap">
        <Button
          leftIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
          variant="outline"
          size="lg"
        >
          Browse More Events
        </Button>
        
        <Button
          onClick={() => router.push(`/events/${purchase.event.id}`)}
          colorScheme="brand"
          size="lg"
        >
          View Event Details
        </Button>
      </HStack>

      {/* Footer Note */}
      <Alert status="success" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="semibold">Thank you for your purchase!</Text>
          <Text fontSize="sm">
            This is a demo system with fair queuing. In a real application, you would receive 
            email confirmation and mobile tickets.
            {isIntent && ' Your purchase was processed through our fair queue system.'}
          </Text>
        </Box>
      </Alert>
    </VStack>
  );
}
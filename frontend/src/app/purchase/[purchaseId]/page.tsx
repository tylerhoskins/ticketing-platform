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
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import ErrorMessage from '@/components/UI/ErrorMessage';

export default function PurchaseConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.purchaseId as string;
  const toast = useToast();

  const [purchase, setPurchase] = useState<PurchaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchase = async () => {
    if (!purchaseId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getPurchaseSummary(purchaseId);
      setPurchase(data);
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

  if (!purchase) {
    return (
      <VStack spacing={4}>
        <ErrorMessage message="Purchase not found" />
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
            This is a demo system. In a real application, you would receive 
            email confirmation and mobile tickets.
          </Text>
        </Box>
      </Alert>
    </VStack>
  );
}
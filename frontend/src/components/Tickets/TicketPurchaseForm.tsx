'use client';

import {
  VStack,
  HStack,
  Button,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Text,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Event } from '@/types/api';

interface TicketPurchaseFormProps {
  event: Event;
  onPurchaseSuccess?: () => void;
}

export default function TicketPurchaseForm({ event, onPurchaseSuccess }: TicketPurchaseFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  const maxQuantity = Math.min(10, event.available_tickets);
  const isDisabled = event.available_tickets === 0 || !event;

  const handlePurchase = async () => {
    if (isDisabled || quantity < 1 || quantity > maxQuantity) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.purchaseTickets(event.id, { quantity });

      if (response.success && response.purchase_id) {
        toast({
          title: 'Purchase Successful!',
          description: `Successfully purchased ${quantity} ticket${quantity > 1 ? 's' : ''}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Redirect to purchase confirmation page
        router.push(`/purchase/${response.purchase_id}`);
        
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
      } else {
        throw new Error(response.message || 'Purchase failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      setError(errorMessage);
      toast({
        title: 'Purchase Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (isDisabled) {
    return (
      <Card>
        <CardBody>
          <Alert status="warning">
            <AlertIcon />
            {event.available_tickets === 0 
              ? 'This event is sold out' 
              : 'Tickets are not available for purchase'}
          </Alert>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Heading size="md">Purchase Tickets</Heading>
      </CardHeader>
      
      <CardBody>
        <VStack spacing={6} align="stretch">
          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="semibold">Available Tickets:</Text>
              <Text color="green.600" fontWeight="bold">
                {event.available_tickets}
              </Text>
            </HStack>

            <VStack spacing={2} align="stretch">
              <Text fontWeight="semibold">Quantity:</Text>
              <NumberInput
                value={quantity}
                onChange={(_, value) => setQuantity(value || 1)}
                min={1}
                max={maxQuantity}
                size="lg"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              
              <Text fontSize="sm" color="gray.600">
                Maximum {maxQuantity} tickets per purchase
              </Text>
            </VStack>

            {quantity > 1 && (
              <HStack justify="space-between" p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="semibold">Total Tickets:</Text>
                <Text fontSize="lg" fontWeight="bold" color="brand.600">
                  {quantity}
                </Text>
              </HStack>
            )}
          </VStack>

          <Button
            colorScheme="brand"
            size="lg"
            onClick={handlePurchase}
            isLoading={loading}
            loadingText="Processing..."
            isDisabled={isDisabled || quantity < 1 || quantity > maxQuantity}
            w="full"
          >
            Purchase {quantity} Ticket{quantity > 1 ? 's' : ''}
          </Button>

          <Text fontSize="xs" color="gray.500" textAlign="center">
            This is a demo system. No actual payment is processed.
          </Text>
        </VStack>
      </CardBody>
    </Card>
  );
}
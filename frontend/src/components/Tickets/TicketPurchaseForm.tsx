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
  useDisclosure,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getUserSessionId } from '@/lib/api';
import { Event } from '@/types/api';
import { CreatePurchaseIntentRequest } from '@/types/queue';
import PurchaseQueueModal from '@/components/Queue/PurchaseQueueModal';

interface TicketPurchaseFormProps {
  event: Event;
  onPurchaseSuccess?: () => void;
}

export default function TicketPurchaseForm({ event, onPurchaseSuccess }: TicketPurchaseFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [userSessionId] = useState(() => getUserSessionId());
  const toast = useToast();
  const router = useRouter();
  const { isOpen: isQueueModalOpen, onOpen: onQueueModalOpen, onClose: onQueueModalClose } = useDisclosure();

  const maxQuantity = Math.min(10, event.available_tickets);
  const isDisabled = event.available_tickets === 0 || !event;

  const handlePurchase = async () => {
    if (isDisabled || quantity < 1 || quantity > maxQuantity) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: CreatePurchaseIntentRequest = {
        quantity,
        user_session_id: userSessionId,
      };

      const response = await apiClient.createPurchaseIntent(event.id, request);

      if (response.success && response.intent_id) {
        setIntentId(response.intent_id);
        onQueueModalOpen();

        
        toast({
          title: 'Added to Purchase Queue',
          description: `You're in position ${response.queue_position || 'TBD'} for ${quantity} ticket${quantity > 1 ? 's' : ''}`,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
      } else {
        throw new Error(response.message || 'Failed to join purchase queue');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join purchase queue';
      setError(errorMessage);
      toast({
        title: 'Purchase Request Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseComplete = (success: boolean, purchaseId?: string) => {
    if (success && purchaseId) {
      // The modal will redirect to the purchase page
      // No additional action needed here
    } else {
      // Purchase failed, reset form state
      setIntentId(null);
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
            loadingText="Joining queue..."
            isDisabled={isDisabled || quantity < 1 || quantity > maxQuantity}
            w="full"
          >
            Join Purchase Queue
          </Button>

          <Text fontSize="xs" color="gray.500" textAlign="center">
            Fair queuing system ensures everyone gets a chance. No actual payment is processed.
          </Text>
        </VStack>
      </CardBody>

      {/* Purchase Queue Modal */}
      <PurchaseQueueModal
        isOpen={isQueueModalOpen}
        onClose={onQueueModalClose}
        intentId={intentId}
        eventName={event.name}
        requestedQuantity={quantity}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </Card>
  );
}
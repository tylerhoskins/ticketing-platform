'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  Progress,
  Box,
  Icon,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FiClock, FiUsers, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import QueuePosition from './QueuePosition';
import { PurchaseIntentStatus } from '@/types/queue';
import { formatWaitTime } from '@/lib/api';

interface PurchaseQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  intentId: string | null;
  eventName?: string;
  requestedQuantity?: number;
  onPurchaseComplete?: (success: boolean, purchaseId?: string) => void;
}

export default function PurchaseQueueModal({
  isOpen,
  onClose,
  intentId,
  eventName,
  requestedQuantity,
  onPurchaseComplete,
}: PurchaseQueueModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [isClosing, setIsClosing] = useState(false);

  const handleCompleted = (success: boolean, purchaseId?: string) => {
    if (success && purchaseId) {
      // Small delay to show success state before redirecting
      setTimeout(() => {
        onPurchaseComplete?.(success, purchaseId);
        onClose();
        router.push(`/purchase/${purchaseId}`);
      }, 2000);
    } else {
      // Show failure state briefly before closing
      setTimeout(() => {
        onPurchaseComplete?.(success);
        onClose();
      }, 3000);
    }
  };

  const handleCancelled = () => {
    setIsClosing(true);
    toast({
      title: 'Purchase Cancelled',
      description: 'Your purchase request has been cancelled',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 1000);
  };

  const handleClose = () => {
    if (!isClosing) {
      onClose();
    }
  };

  if (!intentId) {
    return null;
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size="md" 
      closeOnOverlayClick={false}
      closeOnEsc={!isClosing}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <VStack align="start" spacing={1}>
            <Text>Ticket Purchase Queue</Text>
            {eventName && (
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                {eventName}
              </Text>
            )}
          </VStack>
        </ModalHeader>
        
        {!isClosing && <ModalCloseButton />}

        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* Purchase Summary */}
            {eventName && requestedQuantity && (
              <Box>
                <Alert status="info" variant="subtle">
                  <AlertIcon />
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontWeight="semibold">
                      Purchase Request Submitted
                    </Text>
                    <Text fontSize="sm">
                      Requesting {requestedQuantity} ticket{requestedQuantity !== 1 ? 's' : ''} for {eventName}
                    </Text>
                  </VStack>
                </Alert>
              </Box>
            )}

            {/* Queue Position Component */}
            <QueuePosition
              intentId={intentId}
              onCompleted={handleCompleted}
              onCancelled={handleCancelled}
              showCancelButton={!isClosing}
            />

            {/* Instructions */}
            <Box>
              <Divider mb={3} />
              <VStack spacing={2} align="start">
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  What happens next?
                </Text>
                <VStack spacing={1} align="start" fontSize="sm" color="gray.600">
                  <HStack spacing={2}>
                    <Icon as={FiUsers} />
                    <Text>You're in line with other buyers</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Icon as={FiClock} />
                    <Text>We'll process purchases in fair order</Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Icon as={FiCheckCircle} />
                    <Text>You'll be redirected when complete</Text>
                  </HStack>
                </VStack>
              </VStack>
            </Box>

            {/* Footer Info */}
            <Box pt={2}>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Keep this window open to track your progress. 
                You can safely navigate away - we'll save your place in line.
              </Text>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

// Simple success/failure modal for when queue processing is complete
interface PurchaseResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  message?: string;
  purchaseId?: string;
  ticketCount?: number;
}

export function PurchaseResultModal({
  isOpen,
  onClose,
  success,
  message,
  purchaseId,
  ticketCount,
}: PurchaseResultModalProps) {
  const router = useRouter();

  const handleViewTickets = () => {
    if (purchaseId) {
      router.push(`/purchase/${purchaseId}`);
    }
    onClose();
  };

  const handleTryAgain = () => {
    onClose();
    // Parent component should handle retry logic
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={2}>
            <Icon
              as={success ? FiCheckCircle : FiXCircle}
              color={success ? 'green.500' : 'red.500'}
            />
            <Text>
              {success ? 'Purchase Successful!' : 'Purchase Failed'}
            </Text>
          </HStack>
        </ModalHeader>
        
        <ModalCloseButton />

        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <Alert status={success ? 'success' : 'error'}>
              <AlertIcon />
              <VStack align="start" flex={1}>
                <Text fontWeight="semibold">
                  {success 
                    ? `Successfully purchased ${ticketCount || 1} ticket${(ticketCount || 1) > 1 ? 's' : ''}!`
                    : 'Unable to complete your purchase'
                  }
                </Text>
                {message && (
                  <Text fontSize="sm">{message}</Text>
                )}
              </VStack>
            </Alert>

            <HStack spacing={3} justify="center">
              {success ? (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button colorScheme="brand" onClick={handleViewTickets}>
                    View Tickets
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button colorScheme="brand" onClick={handleTryAgain}>
                    Try Again
                  </Button>
                </>
              )}
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
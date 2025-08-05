'use client';

import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  VStack,
} from '@chakra-ui/react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ 
  title = 'Error', 
  message, 
  onRetry 
}: ErrorMessageProps) {
  return (
    <VStack spacing={4} p={4}>
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <VStack spacing={2} align="flex-start" flex={1}>
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </VStack>
      </Alert>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          Try Again
        </Button>
      )}
    </VStack>
  );
}
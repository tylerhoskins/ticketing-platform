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
  variant?: 'error' | 'warning' | 'info';
}

export default function ErrorMessage({ 
  title,
  message, 
  onRetry,
  variant = 'error'
}: ErrorMessageProps) {
  const getDefaultTitle = () => {
    switch (variant) {
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Error';
    }
  };

  return (
    <VStack spacing={4} p={4}>
      <Alert status={variant} borderRadius="md">
        <AlertIcon />
        <VStack spacing={2} align="flex-start" flex={1}>
          <AlertTitle>{title || getDefaultTitle()}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </VStack>
      </Alert>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          {variant === 'error' ? 'Try Again' : 'Retry Connection'}
        </Button>
      )}
    </VStack>
  );
}
'use client';

import React from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  VStack,
  Box,
  Code,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <VStack spacing={4} p={6} align="stretch">
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box flex="1">
          <AlertTitle>Something went wrong!</AlertTitle>
          <AlertDescription>
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </AlertDescription>
        </Box>
      </Alert>

      <VStack spacing={2}>
        <Button onClick={retry} colorScheme="red" variant="outline">
          Try Again
        </Button>
        
        {error && process.env.NODE_ENV === 'development' && (
          <>
            <Button onClick={onToggle} size="sm" variant="ghost">
              {isOpen ? 'Hide' : 'Show'} Error Details
            </Button>
            
            <Collapse in={isOpen}>
              <Box p={4} bg="gray.100" borderRadius="md" w="full">
                <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap">
                  {error.name}: {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </Code>
              </Box>
            </Collapse>
          </>
        )}
      </VStack>
    </VStack>
  );
}

export default ErrorBoundary;
'use client';

import { Flex, Spinner, Text, VStack } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'lg' 
}: LoadingSpinnerProps) {
  return (
    <Flex justify="center" align="center" minH="200px">
      <VStack spacing={4}>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="brand.500"
          size={size}
        />
        <Text color="gray.600" fontSize="sm">
          {message}
        </Text>
      </VStack>
    </Flex>
  );
}
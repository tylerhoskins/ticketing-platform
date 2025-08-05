'use client';

import {
  VStack,
  Heading,
  Text,
  Button,
  Icon,
  Box,
} from '@chakra-ui/react';
import { CalendarIcon, AddIcon } from '@chakra-ui/icons';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon = CalendarIcon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box textAlign="center" py={16}>
      <VStack spacing={6}>
        <Icon as={icon} boxSize={16} color="gray.300" />
        
        <VStack spacing={2}>
          <Heading size="lg" color="gray.600">
            {title}
          </Heading>
          <Text color="gray.500" maxW="md" lineHeight="1.6">
            {description}
          </Text>
        </VStack>

        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            colorScheme="brand"
            leftIcon={<AddIcon />}
            size="lg"
          >
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Box>
  );
}
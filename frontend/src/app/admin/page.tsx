'use client';

import {
  VStack,
  Heading,
  Text,
  Button,
  Grid,
  GridItem,
  Alert,
  AlertIcon,
  Box,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/navigation';
import EventForm from '@/components/Events/EventForm';

export default function AdminPage() {
  const router = useRouter();

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <VStack spacing={4} align="stretch">
        <Button
          leftIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
          variant="ghost"
          alignSelf="flex-start"
          size="sm"
        >
          Back to Events
        </Button>

        <VStack spacing={2} textAlign="center">
          <Heading size="xl" color="brand.700">
            Event Administration
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Create and manage events
          </Text>
        </VStack>
      </VStack>

      {/* Admin Notice */}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="semibold">Admin Panel</Text>
          <Text fontSize="sm">
            This is a simplified admin interface for creating events. 
            In a production system, this would require proper authentication and authorization.
          </Text>
        </Box>
      </Alert>

      {/* Event Creation Form */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={8}>
        <GridItem>
          <EventForm />
        </GridItem>
        
        <GridItem>
          {/* Instructions */}
          <VStack spacing={6} align="stretch">
            <Box p={6} bg="gray.50" borderRadius="lg">
              <Heading size="md" mb={4} color="brand.600">
                How to Create an Event
              </Heading>
              
              <VStack spacing={3} align="flex-start" fontSize="sm">
                <Text>
                  <strong>1. Event Name:</strong> Enter a descriptive name for your event (max 255 characters)
                </Text>
                
                <Text>
                  <strong>2. Date & Time:</strong> Select when the event will take place (must be in the future)
                </Text>
                
                <Text>
                  <strong>3. Total Tickets:</strong> Set how many tickets are available for purchase
                </Text>
                
                <Text>
                  <strong>4. Submit:</strong> Click "Create Event" to make it available for ticket purchases
                </Text>
              </VStack>
            </Box>

            <Box p={6} bg="blue.50" borderRadius="lg">
              <Heading size="md" mb={4} color="blue.600">
                Event Management Tips
              </Heading>
              
              <VStack spacing={3} align="flex-start" fontSize="sm">
                <Text>
                  • Events cannot be edited once created in this demo
                </Text>
                
                <Text>
                  • Ticket sales are handled automatically
                </Text>
                
                <Text>
                  • The system prevents overselling with proper concurrency control
                </Text>
                
                <Text>
                  • Past events automatically become unavailable for purchase
                </Text>
              </VStack>
            </Box>
          </VStack>
        </GridItem>
      </Grid>
    </VStack>
  );
}
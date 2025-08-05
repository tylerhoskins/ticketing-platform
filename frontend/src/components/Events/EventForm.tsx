'use client';

import {
  VStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
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
import { EventCreateRequest } from '@/types/api';

interface EventFormProps {
  onSuccess?: () => void;
}

interface FormErrors {
  name?: string;
  date?: string;
  total_tickets?: string;
}

export default function EventForm({ onSuccess }: EventFormProps) {
  const [formData, setFormData] = useState<EventCreateRequest>({
    name: '',
    date: '',
    total_tickets: 100,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Event name must not exceed 255 characters';
    }

    if (!formData.date) {
      newErrors.date = 'Event date is required';
    } else {
      const eventDate = new Date(formData.date);
      const now = new Date();
      if (eventDate <= now) {
        newErrors.date = 'Event date must be in the future';
      }
    }

    if (!formData.total_tickets || formData.total_tickets < 1) {
      newErrors.total_tickets = 'Total tickets must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setSubmitError(null);

      // Format the date to ISO string for the API
      const submitData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
      };

      const createdEvent = await apiClient.createEvent(submitData);

      toast({
        title: 'Event Created Successfully!',
        description: `"${createdEvent.name}" has been created`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setFormData({
        name: '',
        date: '',
        total_tickets: 100,
      });
      setErrors({});

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to the created event
        router.push(`/events/${createdEvent.id}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setSubmitError(errorMessage);
      toast({
        title: 'Error Creating Event',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EventCreateRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  return (
    <Card>
      <CardHeader>
        <Heading size="md">Create New Event</Heading>
      </CardHeader>
      
      <CardBody>
        <form onSubmit={handleSubmit}>
          <VStack spacing={6} align="stretch">
            {submitError && (
              <Alert status="error">
                <AlertIcon />
                {submitError}
              </Alert>
            )}

            <FormControl isInvalid={!!errors.name} isRequired>
              <FormLabel>Event Name</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter event name"
                size="lg"
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.date} isRequired>
              <FormLabel>Event Date & Time</FormLabel>
              <Input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={minDate}
                size="lg"
              />
              <FormErrorMessage>{errors.date}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.total_tickets} isRequired>
              <FormLabel>Total Tickets Available</FormLabel>
              <NumberInput
                value={formData.total_tickets}
                onChange={(_, value) => handleInputChange('total_tickets', value || 1)}
                min={1}
                max={10000}
                size="lg"
              >
                <NumberInputField placeholder="Enter total tickets" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.total_tickets}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              colorScheme="brand"
              size="lg"
              isLoading={loading}
              loadingText="Creating..."
              w="full"
            >
              Create Event
            </Button>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
}
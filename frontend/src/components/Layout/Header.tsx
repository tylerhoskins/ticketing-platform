'use client';

import {
  Box,
  Flex,
  Heading,
  HStack,
  Link,
  Container,
  useColorModeValue,
} from '@chakra-ui/react';
import NextLink from 'next/link';

export default function Header() {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box 
      bg={bg} 
      borderBottom="1px" 
      borderColor={borderColor}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Container maxW="7xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <Link as={NextLink} href="/" _hover={{ textDecoration: 'none' }}>
            <Heading size="lg" color="brand.600">
              WeOn
            </Heading>
          </Link>

          <HStack spacing={8}>
            <Link as={NextLink} href="/" fontWeight="medium">
              Events
            </Link>
            <Link as={NextLink} href="/admin" fontWeight="medium">
              Create Event
            </Link>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
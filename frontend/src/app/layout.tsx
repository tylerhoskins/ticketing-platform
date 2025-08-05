import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import Header from '@/components/Layout/Header';
import ErrorBoundary from '@/components/UI/ErrorBoundary';
import { Container, Box } from '@chakra-ui/react';

export const metadata: Metadata = {
  title: 'WeOn - Event Ticket System',
  description: 'Simple ticket purchasing system for events',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ErrorBoundary>
            <Box minH="100vh" bg="gray.50">
              <Header />
              <Container maxW="7xl" py={8}>
                {children}
              </Container>
            </Box>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
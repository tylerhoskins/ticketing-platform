# Frontend

A Next.js frontend application for the ticket purchasing system, built with TypeScript and Chakra UI.

## Features

- **Event Listing**: Browse all events with filtering and search capabilities
- **Event Details**: View detailed event information and purchase tickets
- **Ticket Purchase**: Buy tickets with quantity selection and concurrency handling
- **Purchase Confirmation**: View purchased tickets and event details
- **Admin Panel**: Create new events (simplified admin interface)
- **Responsive Design**: Mobile-friendly interface using Chakra UI
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Loading States**: Smooth loading indicators for all async operations

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Chakra UI
- **State Management**: React hooks (useState, useEffect)
- **API Communication**: Fetch API with custom client
- **Icons**: Chakra UI Icons

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:3001`

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin interface
│   ├── events/[id]/       # Event details page
│   ├── purchase/[purchaseId]/ # Purchase confirmation
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── Events/           # Event-related components
│   ├── Layout/           # Layout components
│   ├── Tickets/          # Ticket-related components
│   └── UI/               # Generic UI components
├── lib/                  # Utilities and configurations
│   ├── api.ts           # API client
│   └── theme.ts         # Chakra UI theme
└── types/               # TypeScript type definitions
    └── api.ts           # API response types
```

## Key Components

### Pages
- **Home (`/`)**: Event listing with filtering and search
- **Event Details (`/events/[id]`)**: Event info and ticket purchasing
- **Purchase Confirmation (`/purchase/[purchaseId]`)**: Ticket confirmation
- **Admin (`/admin`)**: Event creation interface

### Components
- **EventCard**: Display event information in card format
- **EventList**: Grid view with filtering and sorting
- **TicketPurchaseForm**: Handle ticket quantity and purchase
- **EventForm**: Create new events
- **LoadingSpinner**: Loading states
- **ErrorMessage**: Error handling and retry functionality
- **ErrorBoundary**: Catch and handle React errors

## API Integration

The frontend communicates with the NestJS backend API:

- `GET /api/events` - List all events
- `GET /api/events/upcoming` - List upcoming events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create new event
- `POST /api/events/:id/purchase` - Purchase tickets
- `GET /api/tickets/purchase/:purchaseId` - Get purchase details
- `GET /api/tickets/purchase/:purchaseId/summary` - Get purchase summary

## Error Handling

The application includes comprehensive error handling:

- **Network Errors**: Automatic retry with user feedback
- **API Errors**: Display meaningful error messages
- **React Errors**: Error boundaries to prevent crashes
- **Form Validation**: Client-side validation with server-side backup
- **Concurrent Purchase**: Handle sold-out scenarios gracefully

## Development Notes

- Uses Next.js 14+ App Router for modern React patterns
- TypeScript interfaces match backend DTOs exactly
- Chakra UI provides consistent, accessible components
- All API calls include proper error handling and loading states
- Responsive design works on mobile and desktop
- No external state management library needed (uses React hooks)

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. Or deploy to platforms like Vercel, Netlify, or Docker:
   ```bash
   # Example Dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

This is a demo application. In a production environment, you would want to add:

- User authentication and authorization
- Payment processing integration
- Email notifications
- Advanced admin features
- Analytics and monitoring
- Automated testing
- CI/CD pipeline
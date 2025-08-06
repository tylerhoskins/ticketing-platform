# API Endpoints

The NestJS backend provides the following REST API endpoints:

## Base URL
All endpoints are prefixed with `/api`

## Health Check Endpoints

### GET /api/health
Returns basic application health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": "10 minutes",
  "memory": {
    "used": "50 MB",
    "total": "100 MB"
  },
  "environment": "development",
  "version": "1.0.0"
}
```

### GET /api/health/database
Returns database connectivity status and basic statistics.

**Response:**
```json
{
  "status": "connected",
  "responseTime": "5ms",
  "database": {
    "type": "postgres",
    "host": "localhost",
    "database": "app_db"
  },
  "stats": {
    "total_events": 5,
    "total_tickets": 150
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Event Endpoints

### POST /api/events
Create a new event.

**Request Body:**
```json
{
  "name": "Concert in the Park",
  "date": "2024-12-25T19:00:00.000Z",
  "total_tickets": 100
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Concert in the Park",
  "date": "2024-12-25T19:00:00.000Z",
  "total_tickets": 100,
  "available_tickets": 100,
  "created_at": "2024-01-01T12:00:00.000Z",
  "updated_at": "2024-01-01T12:00:00.000Z",
  "version": 1
}
```

### GET /api/events
Get all events with optional ordering.

**Query Parameters:**
- `orderBy` (optional): `date` or `created_at` (default: `date`)

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Concert in the Park",
    "date": "2024-12-25T19:00:00.000Z",
    "total_tickets": 100,
    "available_tickets": 85,
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z",
    "version": 3
  }
]
```

### GET /api/events/upcoming
Get only upcoming events (events in the future).

**Response:** Same format as GET /api/events

### GET /api/events/:id
Get event details by ID.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Concert in the Park",
  "date": "2024-12-25T19:00:00.000Z",
  "total_tickets": 100,
  "available_tickets": 85,
  "created_at": "2024-01-01T12:00:00.000Z",
  "updated_at": "2024-01-01T12:00:00.000Z",
  "version": 3
}
```

### POST /api/events/:id/purchase
Create a purchase intent for tickets (fairness-aware queue system).

**Request Body:**
```json
{
  "quantity": 2,
  "user_session_id": "session-uuid-123"
}
```

**Response (Intent Created):**
```json
{
  "success": true,
  "message": "Purchase intent created successfully",
  "intent_id": "intent-uuid-456",
  "queue_position": 3,
  "estimated_wait_minutes": 2,
  "status": "waiting"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Event not found or not available for purchase"
}
```

### GET /api/events/:id/tickets
Get all tickets for an event (admin endpoint).

**Response:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_tickets": 15,
  "tickets": [
    {
      "id": "ticket-uuid-1",
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "purchase_id": "123e4567-e89b-12d3-a456-426614174000",
      "purchased_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## Queue Management Endpoints

### GET /api/queue/intent/:intentId/status
Get current status and position of a purchase intent.

**Response:**
```json
{
  "intent_id": "intent-uuid-456",
  "status": "waiting",
  "queue_position": 2,
  "estimated_wait_minutes": 1,
  "requested_quantity": 2,
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Concert in the Park",
    "date": "2024-12-25T19:00:00.000Z"
  },
  "created_at": "2024-01-01T12:00:00.000Z"
}
```

### GET /api/queue/event/:eventId/stats
Get queue statistics for an event.

**Response:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_waiting": 5,
  "total_processing": 1,
  "total_completed": 150,
  "total_failed": 2,
  "estimated_wait_minutes": 3,
  "processing_rate_per_minute": 10
}
```

### POST /api/queue/intent/:intentId/cancel
Cancel a purchase intent.

**Response:**
```json
{
  "success": true,
  "message": "Purchase intent cancelled successfully",
  "intent_id": "intent-uuid-456"
}
```

### GET /api/queue/health
Get queue processor health status.

**Response:**
```json
{
  "status": "healthy",
  "processor_running": true,
  "last_processed": "2024-01-01T12:00:00.000Z",
  "intents_processed_today": 1250,
  "average_processing_time_ms": 150
}
```

## Ticket Endpoints

### GET /api/tickets/intent/:intentId/status
Get intent status (alternative endpoint).

**Response:** Same as GET /api/queue/intent/:intentId/status

### GET /api/tickets/intent/:intentId/completion
Check if an intent has completed and get final result.

**Response (Completed):**
```json
{
  "intent_id": "intent-uuid-456",
  "status": "completed",
  "success": true,
  "purchase_id": "123e4567-e89b-12d3-a456-426614174000",
  "total_tickets": 2,
  "processing_time_ms": 1500,
  "tickets": [
    {
      "id": "ticket-uuid-1",
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "purchase_id": "123e4567-e89b-12d3-a456-426614174000",
      "purchased_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### GET /api/tickets/purchase/:purchaseId
Get tickets by purchase ID.

**Response:**
```json
[
  {
    "id": "ticket-uuid-1",
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "purchase_id": "123e4567-e89b-12d3-a456-426614174000",
    "purchased_at": "2024-01-01T12:00:00.000Z",
    "event": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Concert in the Park",
      "date": "2024-12-25T19:00:00.000Z"
    }
  }
]
```

### GET /api/tickets/purchase/:purchaseId/summary
Get detailed purchase summary.

**Response:**
```json
{
  "purchase_id": "123e4567-e89b-12d3-a456-426614174000",
  "purchased_at": "2024-01-01T12:00:00.000Z",
  "total_tickets": 2,
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Concert in the Park",
    "date": "2024-12-25T19:00:00.000Z"
  },
  "tickets": [...]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed: quantity: must be at least 1",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/events/123/purchase"
}
```

## Fairness-Aware Queue System

The ticket purchasing system implements a **fairness-aware queue system** that ensures first-come-first-served ordering:

### Key Features:
- **Purchase Intents**: All purchase requests create intents with microsecond-precision timestamps
- **FIFO Processing**: Intents are processed in strict chronological order
- **Real-time Status**: Users can track their queue position and estimated wait time
- **Cancellation Support**: Users can cancel their queue position at any time
- **Background Processing**: Queue processor runs every 2 seconds to handle intents

### Fairness Guarantees:
- **Temporal Ordering**: Requests are processed based on exact arrival time
- **No Queue Jumping**: Later requests cannot complete before earlier ones
- **Transparent Process**: Users see their exact position and estimated wait time
- **Atomic Processing**: Each intent is processed atomically with pessimistic locking

### Queue Status Flow:
1. **waiting** → Intent created, waiting in queue
2. **processing** → Intent being processed by queue service
3. **completed** → Tickets successfully purchased
4. **failed** → Purchase failed (insufficient tickets, expired event, etc.)
5. **expired** → Intent expired after 30 minutes without processing

### Technical Implementation:
- **Pessimistic locking** on event records during actual ticket purchase
- **Database transactions** to ensure atomicity of ticket allocation
- **Microsecond timestamps** for precise ordering
- **Background queue processor** with comprehensive error handling
- **Real-time polling** for status updates (recommended 2-3 second intervals)
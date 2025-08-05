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
Purchase tickets for an event.

**Request Body:**
```json
{
  "quantity": 2
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully purchased 2 tickets",
  "purchase_id": "123e4567-e89b-12d3-a456-426614174000",
  "total_purchased": 2,
  "tickets": [
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
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Only 5 tickets available"
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

## Ticket Endpoints

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

## Concurrency Control

The ticket purchasing system implements:
- **Pessimistic locking** on event records during purchase
- **Optimistic locking** with version fields to handle race conditions
- **Database transactions** to ensure data consistency
- **Proper error handling** for concurrent access scenarios
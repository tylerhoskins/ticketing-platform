# Database Schema Documentation

## Overview
This document describes the PostgreSQL database schema for the ticket purchasing system, designed to handle concurrent ticket purchases safely.

## Schema Design

### Events Table
```sql
CREATE TABLE "events" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" varchar(255) NOT NULL,
  "date" timestamp with time zone NOT NULL,
  "total_tickets" integer NOT NULL,
  "available_tickets" integer NOT NULL,
  "version" integer NOT NULL DEFAULT 1, -- For optimistic locking
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints to ensure data integrity
  CONSTRAINT "CHK_available_tickets_non_negative" CHECK ("available_tickets" >= 0),
  CONSTRAINT "CHK_total_tickets_non_negative" CHECK ("total_tickets" >= 0),
  CONSTRAINT "CHK_available_tickets_within_total" CHECK ("available_tickets" <= "total_tickets")
);
```

### Tickets Table
```sql
CREATE TABLE "tickets" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "purchase_id" uuid NOT NULL, -- Groups tickets bought together
  "purchased_at" timestamp with time zone NOT NULL DEFAULT now()
);
```

## Concurrency Control Strategy

### 1. Pessimistic Locking
- Uses `SELECT ... FOR UPDATE` during ticket purchase transactions
- Prevents other transactions from modifying the same event row
- Implemented in `EventRepository.purchaseTickets()`

### 2. Optimistic Locking
- Uses version field to detect concurrent modifications
- Prevents lost updates when multiple transactions try to modify the same event
- Version is incremented on each update

### 3. Transaction Isolation
- All ticket purchases happen within database transactions
- Ensures atomicity of ticket count updates and ticket creation
- Automatic rollback on errors

## Database Operations

### Setup Commands
```bash
# Install dependencies
npm install

# Run migrations
npm run migration:run

# Generate new migration (after entity changes)
npm run migration:generate src/migrations/MigrationName

# Revert last migration
npm run migration:revert
```

### Environment Variables
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=app_db
```

## Performance Optimizations

### Indexes
- `events.date` - For efficient event listing by date
- `tickets.event_id` - For foreign key performance
- `tickets.purchase_id` - For grouping tickets by purchase
- `tickets.purchased_at` - For time-based queries

### Connection Pool Settings
- Connection limit: 20 concurrent connections
- Acquire timeout: 60 seconds
- Idle timeout: 30 seconds

## Usage Examples

### Creating an Event
```typescript
const event = await eventRepository.create({
  name: 'Concert 2024',
  date: new Date('2024-12-01T20:00:00Z'),
  total_tickets: 1000,
  available_tickets: 1000,
});
```

### Purchasing Tickets (Concurrency-Safe)
```typescript
const result = await eventRepository.purchaseTickets(
  eventId,
  2, // quantity
  purchaseId
);

if (result.success) {
  console.log('Tickets purchased:', result.tickets);
} else {
  console.error('Purchase failed:', result.message);
}
```

## Testing Concurrency

The repository includes proper error handling for:
- Insufficient tickets
- Concurrent modification conflicts
- Database connection issues
- Transaction failures

All operations are designed to be safe under high concurrency scenarios typical of ticket sales.
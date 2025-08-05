// Event types based on backend DTOs
export interface Event {
  id: string;
  name: string;
  date: string;
  total_tickets: number;
  available_tickets: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface EventCreateRequest {
  name: string;
  date: string;
  total_tickets: number;
}

export interface Ticket {
  id: string;
  event_id: string;
  purchase_id: string;
  purchased_at: string;
  event?: {
    id: string;
    name: string;
    date: string;
  };
}

export interface PurchaseRequest {
  quantity: number;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  purchase_id?: string;
  tickets?: Ticket[];
  total_purchased?: number;
}

export interface PurchaseSummary {
  purchase_id: string;
  purchased_at: string;
  total_tickets: number;
  event: {
    id: string;
    name: string;
    date: string;
  };
  tickets: Ticket[];
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: string;
  memory: {
    used: string;
    total: string;
  };
  environment: string;
  version: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

// Helper types for computed properties
export interface EventWithComputed extends Event {
  soldTickets: number;
  isSoldOut: boolean;
  isUpcoming: boolean;
}
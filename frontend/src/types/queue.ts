// Queue types based on backend DTOs

export enum PurchaseIntentStatus {
  WAITING = 'waiting',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export interface CreatePurchaseIntentRequest {
  quantity: number;
  user_session_id: string;
}

export interface PurchaseIntentResponse {
  success: boolean;
  message: string;
  intent_id?: string;
  queue_position?: number;
  estimated_wait_time?: number; // in seconds
  event_id?: string;
  requested_quantity?: number;
  created_at?: string;
}

export interface IntentStatus {
  intent_id: string;
  status: PurchaseIntentStatus;
  queue_position?: number;
  estimated_wait_time?: number; // in seconds
  created_at: string;
  updated_at: string;
  requested_quantity: number;
  event_id: string;
  user_session_id: string;
  
  // Event details for convenience
  event?: {
    id: string;
    name: string;
    date: string;
    available_tickets: number;
  };

  // If completed, include purchase details
  purchase_result?: {
    success: boolean;
    message: string;
    purchase_id?: string;
    tickets_purchased?: number;
  };
}

export interface QueueStats {
  event_id: string;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  expired: number;
  total_active: number;
  
  // Event details
  event?: {
    id: string;
    name: string;
    date: string;
    total_tickets: number;
    available_tickets: number;
  };
}

export interface IntentCompletion {
  intent_id: string;
  status: PurchaseIntentStatus;
  success: boolean;
  message: string;
  completed_at: string;
  processing_time?: number; // in milliseconds
  
  // If successful, include ticket details
  purchase_id?: string;
  tickets?: Array<{
    id: string;
    event_id: string;
    purchased_at: string;
  }>;
  total_tickets_purchased?: number;

  // Event details
  event?: {
    id: string;
    name: string;
    date: string;
  };
}

export interface ProcessorHealth {
  is_running: boolean;
  last_processed_at?: string;
  total_processed: number;
  total_failed: number;
  average_processing_time: number; // in milliseconds
  success_rate?: number; // percentage
}

export interface CancelIntentRequest {
  intent_id: string;
  user_session_id: string;
}

export interface CancelIntentResponse {
  success: boolean;
  message: string;
  intent_id: string;
  cancelled_at?: string;
}

export interface UserIntents {
  user_session_id: string;
  total_active_intents: number;
  intents: Array<{
    intent_id: string;
    event_id: string;
    event_name: string;
    event_date: string;
    status: PurchaseIntentStatus;
    queue_position?: number;
    estimated_wait_time?: number;
    requested_quantity: number;
    created_at: string;
  }>;
}

// Helper types for queue position display
export interface QueuePosition {
  position: number;
  estimatedWait: number; // in seconds
  totalWaiting: number;
  processingRate?: number; // intents per minute
}

// Session management
export interface UserSession {
  sessionId: string;
  createdAt: string;
  activeIntents: string[]; // intent IDs
}

// UI state types
export interface QueueUIState {
  isPolling: boolean;
  lastUpdate?: string;
  error?: string;
  retryCount: number;
}
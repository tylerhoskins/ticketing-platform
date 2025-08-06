import {
  Event,
  EventCreateRequest,
  PurchaseRequest,
  PurchaseResponse,
  PurchaseSummary,
  Ticket,
  HealthStatus,
  ApiError,
} from '@/types/api';
import {
  CreatePurchaseIntentRequest,
  PurchaseIntentResponse,
  IntentStatus,
  QueueStats,
  IntentCompletion,
  CancelIntentRequest,
  CancelIntentResponse,
  ProcessorHealth,
  UserIntents,
} from '@/types/queue';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`API Request: ${url}`, config);
      const response = await fetch(url, config);
      console.log(`API Response: ${response.status} - ${url}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error Response: ${response.status} - ${url}`, errorText);
        
        try {
          const errorData: ApiError = JSON.parse(errorText);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log(`API Success: ${url}`, data);
      return data;
    } catch (error) {
      console.error(`API Request failed: ${url}`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Health endpoints
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health');
  }

  // Event endpoints
  async getEvents(orderBy: 'date' | 'created_at' = 'date'): Promise<Event[]> {
    return this.request<Event[]>(`/events?orderBy=${orderBy}`);
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return this.request<Event[]>('/events/upcoming');
  }

  async getEvent(id: string): Promise<Event> {
    return this.request<Event>(`/events/${id}`);
  }

  async createEvent(event: EventCreateRequest): Promise<Event> {
    return this.request<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async purchaseTickets(eventId: string, purchase: PurchaseRequest): Promise<PurchaseResponse> {
    return this.request<PurchaseResponse>(`/events/${eventId}/purchase`, {
      method: 'POST',
      body: JSON.stringify(purchase),
    });
  }

  // Ticket endpoints
  async getPurchaseTickets(purchaseId: string): Promise<Ticket[]> {
    return this.request<Ticket[]>(`/tickets/purchase/${purchaseId}`);
  }

  async getPurchaseSummary(purchaseId: string): Promise<PurchaseSummary> {
    return this.request<PurchaseSummary>(`/tickets/purchase/${purchaseId}/summary`);
  }

  // Queue-based purchase intent endpoints
  async createPurchaseIntent(eventId: string, request: CreatePurchaseIntentRequest): Promise<PurchaseIntentResponse> {
    return this.request<PurchaseIntentResponse>(`/events/${eventId}/purchase`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getIntentStatus(intentId: string): Promise<IntentStatus> {
    return this.request<IntentStatus>(`/queue/intent/${intentId}/status`);
  }

  async getQueueStats(eventId: string): Promise<QueueStats> {
    return this.request<QueueStats>(`/queue/event/${eventId}/stats`);
  }

  async cancelPurchaseIntent(request: CancelIntentRequest): Promise<CancelIntentResponse> {
    return this.request<CancelIntentResponse>(`/queue/intent/${request.intent_id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async checkIntentCompletion(intentId: string): Promise<IntentCompletion> {
    return this.request<IntentCompletion>(`/tickets/intent/${intentId}/completion`);
  }

  async getProcessorHealth(): Promise<ProcessorHealth> {
    return this.request<ProcessorHealth>('/queue/health');
  }

  async getUserIntents(userSessionId: string, eventId?: string): Promise<UserIntents> {
    const query = eventId ? `?event_id=${eventId}` : '';
    return this.request<UserIntents>(`/queue/user/${userSessionId}/intents${query}`);
  }
}

export const apiClient = new ApiClient();

// Utility functions for computed properties
export const addComputedProperties = (event: Event) => {
  return {
    ...event,
    soldTickets: event.total_tickets - event.available_tickets,
    isSoldOut: event.available_tickets === 0,
    isUpcoming: new Date(event.date) > new Date(),
    date: new Date(event.date).toISOString(),
  };
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Session management utilities
export const generateUserSessionId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getUserSessionId = (): string => {
  if (typeof window === 'undefined') {
    return generateUserSessionId();
  }
  
  let sessionId = localStorage.getItem('user_session_id');
  if (!sessionId) {
    sessionId = generateUserSessionId();
    localStorage.setItem('user_session_id', sessionId);
  }
  return sessionId;
};

export const clearUserSessionId = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_session_id');
  }
};

// Queue utility functions
export const formatWaitTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};
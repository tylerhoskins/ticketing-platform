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
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
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
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventRepository } from '../../repositories/event.repository';
import { CreateEventDto, EventResponseDto, EventListQueryDto } from '../../dto/event.dto';
import { Event } from '../../entities/event.entity';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private readonly eventRepository: EventRepository) {}

  /**
   * Create a new event with validation
   */
  async createEvent(createEventDto: CreateEventDto): Promise<EventResponseDto> {
    this.logger.log(`Creating new event: ${createEventDto.name}`);

    // Validate event date is in the future
    const eventDate = new Date(createEventDto.date);
    if (eventDate <= new Date()) {
      throw new BadRequestException('Event date must be in the future');
    }

    // Create event with available_tickets equal to total_tickets initially
    const eventData: Partial<Event> = {
      name: createEventDto.name,
      date: eventDate,
      total_tickets: createEventDto.total_tickets,
      available_tickets: createEventDto.total_tickets,
    };

    try {
      const event = await this.eventRepository.create(eventData);
      this.logger.log(`Event created successfully with ID: ${event.id}`);
      return this.mapToResponseDto(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create event: ${errorMessage}`, errorStack);
      throw new BadRequestException('Failed to create event');
    }
  }

  /**
   * Get all events with optional ordering
   */
  async getAllEvents(query: EventListQueryDto = {}): Promise<EventResponseDto[]> {
    this.logger.log(`Fetching all events, ordered by: ${query.orderBy || 'date'}`);

    try {
      const events = await this.eventRepository.findAll(query.orderBy);
      this.logger.log(`Retrieved ${events.length} events`);
      return events.map(event => this.mapToResponseDto(event));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch events: ${errorMessage}`, errorStack);
      throw new BadRequestException('Failed to fetch events');
    }
  }

  /**
   * Get event by ID with detailed information
   */
  async getEventById(id: string): Promise<EventResponseDto> {
    this.logger.log(`Fetching event with ID: ${id}`);

    // Validate UUID format
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid event ID format');
    }

    try {
      const event = await this.eventRepository.findById(id);
      
      if (!event) {
        this.logger.warn(`Event not found with ID: ${id}`);
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      this.logger.log(`Event found: ${event.name}`);
      return this.mapToResponseDto(event);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch event: ${errorMessage}`, errorStack);
      throw new BadRequestException('Failed to fetch event');
    }
  }

  /**
   * Get upcoming events (events in the future)
   */
  async getUpcomingEvents(): Promise<EventResponseDto[]> {
    this.logger.log('Fetching upcoming events');

    try {
      const allEvents = await this.eventRepository.findAll('date');
      const upcomingEvents = allEvents.filter(event => new Date(event.date) > new Date());
      
      this.logger.log(`Found ${upcomingEvents.length} upcoming events`);
      return upcomingEvents.map(event => this.mapToResponseDto(event));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch upcoming events: ${errorMessage}`, errorStack);
      throw new BadRequestException('Failed to fetch upcoming events');
    }
  }

  /**
   * Check if event exists and has available tickets
   */
  async checkEventAvailability(eventId: string, quantity: number = 1): Promise<{ available: boolean; event: Event | null }> {
    const event = await this.eventRepository.findById(eventId);
    
    if (!event) {
      return { available: false, event: null };
    }

    const available = event.hasAvailableTickets(quantity) && new Date(event.date) > new Date();
    return { available, event };
  }

  /**
   * Map Event entity to EventResponseDto
   */
  private mapToResponseDto(event: Event): EventResponseDto {
    const dto = new EventResponseDto();
    dto.id = event.id;
    dto.name = event.name;
    dto.date = event.date;
    dto.total_tickets = event.total_tickets;
    dto.available_tickets = event.available_tickets;
    dto.created_at = event.created_at;
    dto.updated_at = event.updated_at;
    dto.version = event.version;
    return dto;
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventRepository } from '../../repositories/event.repository';
import { EventService } from '../event/event.service';
import { PurchaseTicketDto, PurchaseResponseDto, TicketResponseDto } from '../../dto/ticket.dto';
import { Ticket } from '../../entities/ticket.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventService: EventService,
  ) {}

  /**
   * Purchase tickets for an event with concurrency control
   */
  async purchaseTickets(eventId: string, purchaseDto: PurchaseTicketDto): Promise<PurchaseResponseDto> {
    this.logger.log(`Attempting to purchase ${purchaseDto.quantity} tickets for event ${eventId}`);

    // Validate UUID format
    if (!this.isValidUUID(eventId)) {
      throw new BadRequestException('Invalid event ID format');
    }

    // Check if event exists and is available for purchase
    const { available, event } = await this.eventService.checkEventAvailability(eventId, purchaseDto.quantity);
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (!available) {
      const reasons = [];
      if (new Date(event.date) <= new Date()) {
        reasons.push('Event has already occurred');
      }
      if (!event.hasAvailableTickets(purchaseDto.quantity)) {
        reasons.push(`Only ${event.available_tickets} tickets available`);
      }
      
      const message = reasons.length > 0 ? reasons.join(', ') : 'Tickets not available for purchase';
      this.logger.warn(`Purchase failed for event ${eventId}: ${message}`);
      
      return {
        success: false,
        message,
      };
    }

    // Generate unique purchase ID for this transaction
    const purchaseId = uuidv4();
    
    try {
      // Use repository's concurrency-safe purchase method
      const result = await this.eventRepository.purchaseTickets(eventId, purchaseDto.quantity, purchaseId);
      
      if (!result.success) {
        this.logger.warn(`Purchase failed for event ${eventId}: ${result.message}`);
        return {
          success: false,
          message: result.message,
        };
      }

      const ticketDtos = result.tickets?.map(ticket => this.mapToTicketResponseDto(ticket, event)) || [];
      
      this.logger.log(`Successfully purchased ${purchaseDto.quantity} tickets for event ${eventId}, purchase ID: ${purchaseId}`);
      
      return {
        success: true,
        message: `Successfully purchased ${purchaseDto.quantity} tickets`,
        purchase_id: purchaseId,
        tickets: ticketDtos,
        total_purchased: purchaseDto.quantity,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Unexpected error during ticket purchase: ${errorMessage}`, errorStack);
      return {
        success: false,
        message: 'An unexpected error occurred during ticket purchase',
      };
    }
  }

  /**
   * Get tickets by purchase ID
   */
  async getTicketsByPurchase(purchaseId: string): Promise<TicketResponseDto[]> {
    this.logger.log(`Fetching tickets for purchase ID: ${purchaseId}`);

    if (!this.isValidUUID(purchaseId)) {
      throw new BadRequestException('Invalid purchase ID format');
    }

    try {
      const tickets = await this.eventRepository.getTicketsByPurchase(purchaseId);
      
      if (tickets.length === 0) {
        throw new NotFoundException(`No tickets found for purchase ID ${purchaseId}`);
      }

      this.logger.log(`Found ${tickets.length} tickets for purchase ID: ${purchaseId}`);
      return tickets.map(ticket => this.mapToTicketResponseDto(ticket));
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch tickets by purchase: ${errorMessage}`, errorStack);
      throw new BadRequestException('Failed to fetch tickets');
    }
  }

  /**
   * Get all tickets for an event (admin functionality)
   */
  async getTicketsByEvent(eventId: string): Promise<TicketResponseDto[]> {
    this.logger.log(`Fetching tickets for event: ${eventId}`);

    if (!this.isValidUUID(eventId)) {
      throw new BadRequestException('Invalid event ID format');
    }

    // Verify event exists
    const event = await this.eventService.getEventById(eventId);
    
    try {
      const tickets = await this.eventRepository.getTicketsByEvent(eventId);
      this.logger.log(`Found ${tickets.length} tickets for event: ${eventId}`);
      return tickets.map(ticket => this.mapToTicketResponseDto(ticket));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch event tickets: ${errorMessage}`, errorStack);
      throw new BadRequestException('Failed to fetch event tickets');
    }
  }

  /**
   * Get purchase summary with event details
   */
  async getPurchaseSummary(purchaseId: string): Promise<{
    purchase_id: string;
    purchased_at: Date;
    total_tickets: number;
    event: {
      id: string;
      name: string;
      date: Date;
    };
    tickets: TicketResponseDto[];
  }> {
    const tickets = await this.getTicketsByPurchase(purchaseId);
    
    if (tickets.length === 0) {
      throw new NotFoundException(`Purchase ${purchaseId} not found`);
    }

    const firstTicket = tickets[0];
    const event = firstTicket.event || await this.eventService.getEventById(firstTicket.event_id);

    return {
      purchase_id: purchaseId,
      purchased_at: firstTicket.purchased_at,
      total_tickets: tickets.length,
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
      },
      tickets,
    };
  }

  /**
   * Map Ticket entity to TicketResponseDto
   */
  private mapToTicketResponseDto(ticket: Ticket, eventDetails?: any): TicketResponseDto {
    const dto = new TicketResponseDto();
    dto.id = ticket.id;
    dto.event_id = ticket.event_id;
    dto.purchase_id = ticket.purchase_id;
    dto.purchased_at = ticket.purchased_at;
    
    // Include event details if available
    if (ticket.event || eventDetails) {
      const event = ticket.event || eventDetails;
      dto.event = {
        id: event.id,
        name: event.name,
        date: event.date,
      };
    }
    
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
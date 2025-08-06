import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventRepository } from '../../repositories/event.repository';
import { PurchaseIntentRepository } from '../../repositories/purchase-intent.repository';
import { EventService } from '../event/event.service';
import { PurchaseTicketDto, PurchaseResponseDto, TicketResponseDto } from '../../dto/ticket.dto';
import { Ticket } from '../../entities/ticket.entity';
import { PurchaseIntent, PurchaseIntentStatus } from '../../entities/purchase-intent.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly purchaseIntentRepository: PurchaseIntentRepository,
    private readonly eventService: EventService,
  ) {}

  /**
   * Create a purchase intent for an event (new intent-based flow)
   */
  async purchaseTickets(eventId: string, purchaseDto: PurchaseTicketDto): Promise<PurchaseResponseDto> {
    this.logger.log(`Creating purchase intent for ${purchaseDto.quantity} tickets for event ${eventId} (session: ${purchaseDto.user_session_id})`);

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
      if (event.available_tickets === 0) {
        reasons.push('No tickets available');
      }
      
      const message = reasons.length > 0 ? reasons.join(', ') : 'Event not available for purchase';
      this.logger.warn(`Purchase intent creation failed for event ${eventId}: ${message}`);
      
      return {
        success: false,
        message,
        is_intent_based: true,
      };
    }

    try {
      // Check if user already has an active intent for this event
      const existingIntent = await this.purchaseIntentRepository.getIntentBySessionAndEvent(
        purchaseDto.user_session_id,
        eventId
      );

      if (existingIntent) {
        this.logger.log(`User ${purchaseDto.user_session_id} already has an active intent for event ${eventId}`);
        
        // Get current queue position
        const position = await this.purchaseIntentRepository.getQueuePosition(
          purchaseDto.user_session_id,
          eventId
        );

        return {
          success: true,
          message: `You already have an active purchase intent for this event`,
          intent_id: existingIntent.id,
          queue_position: position?.position,
          estimated_wait_time: position?.estimatedWaitTime,
          is_intent_based: true,
        };
      }

      // Create new purchase intent
      const intent = await this.purchaseIntentRepository.createIntent({
        eventId,
        userSessionId: purchaseDto.user_session_id,
        requestedQuantity: purchaseDto.quantity,
      });

      // Get initial queue position
      const position = await this.purchaseIntentRepository.getQueuePosition(
        purchaseDto.user_session_id,
        eventId
      );

      this.logger.log(`Created purchase intent ${intent.id} for user ${purchaseDto.user_session_id}, position: ${position?.position}`);

      return {
        success: true,
        message: `Purchase intent created successfully. You are ${position?.position ? `#${position.position}` : ''} in queue.`,
        intent_id: intent.id,
        queue_position: position?.position,
        estimated_wait_time: position?.estimatedWaitTime,
        is_intent_based: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Unexpected error during purchase intent creation: ${errorMessage}`, errorStack);
      return {
        success: false,
        message: 'An unexpected error occurred while creating purchase intent',
        is_intent_based: true,
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
   * Get status of a purchase intent
   */
  async getIntentStatus(intentId: string): Promise<{
    intent: PurchaseIntent;
    queuePosition?: number;
    estimatedWaitTime?: number;
  }> {
    if (!this.isValidUUID(intentId)) {
      throw new BadRequestException('Invalid intent ID format');
    }

    const intent = await this.purchaseIntentRepository.findById(intentId, ['event']);

    if (!intent) {
      throw new NotFoundException(`Purchase intent ${intentId} not found`);
    }

    let queuePosition: number | undefined;
    let estimatedWaitTime: number | undefined;

    if (intent.isActive()) {
      const position = await this.purchaseIntentRepository.getQueuePosition(
        intent.user_session_id,
        intent.event_id
      );
      
      if (position) {
        queuePosition = position.position;
        estimatedWaitTime = position.estimatedWaitTime;
      }
    }

    return {
      intent,
      queuePosition,
      estimatedWaitTime,
    };
  }

  /**
   * Get current queue position for a user's intent
   */
  async getQueuePosition(userSessionId: string, eventId: string): Promise<{
    position: number;
    totalAhead: number;
    estimatedWaitTime?: number;
  } | null> {
    if (!this.isValidUUID(eventId)) {
      throw new BadRequestException('Invalid event ID format');
    }

    return this.purchaseIntentRepository.getQueuePosition(userSessionId, eventId);
  }

  /**
   * Cancel a user's purchase intent
   */
  async cancelPurchaseIntent(intentId: string, userSessionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!this.isValidUUID(intentId)) {
      throw new BadRequestException('Invalid intent ID format');
    }

    // Get the intent and verify ownership
    const intent = await this.purchaseIntentRepository.findById(intentId);

    if (!intent) {
      throw new NotFoundException(`Purchase intent ${intentId} not found`);
    }

    if (intent.user_session_id !== userSessionId) {
      throw new BadRequestException('You can only cancel your own purchase intents');
    }

    if (!intent.isActive()) {
      return {
        success: false,
        message: `Cannot cancel intent - current status is ${intent.status}`,
      };
    }

    // Cancel the intent by marking it as expired
    const cancelled = await this.purchaseIntentRepository.updateIntentStatus(
      intentId, 
      PurchaseIntentStatus.EXPIRED
    );

    if (cancelled) {
      this.logger.log(`Successfully cancelled intent ${intentId} for user ${userSessionId}`);
      return {
        success: true,
        message: 'Purchase intent cancelled successfully',
      };
    } else {
      return {
        success: false,
        message: 'Failed to cancel purchase intent',
      };
    }
  }

  /**
   * Check if an intent has completed and get results
   */
  async checkIntentCompletion(intentId: string): Promise<{
    is_completed: boolean;
    status: PurchaseIntentStatus;
    purchase_id?: string;
    tickets?: TicketResponseDto[];
    message?: string;
  }> {
    if (!this.isValidUUID(intentId)) {
      throw new BadRequestException('Invalid intent ID format');
    }

    const intent = await this.purchaseIntentRepository.findById(intentId, ['event']);

    if (!intent) {
      throw new NotFoundException(`Purchase intent ${intentId} not found`);
    }

    const result = {
      is_completed: intent.isCompleted(),
      status: intent.status,
    };

    if (intent.status === PurchaseIntentStatus.COMPLETED) {
      // Intent was successfully processed, get the tickets
      try {
        const tickets = await this.getTicketsByPurchase(intentId);
        return {
          ...result,
          purchase_id: intentId,
          tickets,
          message: `Successfully purchased ${tickets.length} tickets`,
        };
      } catch (error) {
        this.logger.warn(`Could not find tickets for completed intent ${intentId}`);
        return {
          ...result,
          message: 'Purchase completed but tickets not found',
        };
      }
    } else if (intent.status === PurchaseIntentStatus.FAILED) {
      return {
        ...result,
        message: 'Purchase failed - tickets may no longer be available',
      };
    } else if (intent.status === PurchaseIntentStatus.EXPIRED) {
      return {
        ...result,
        message: 'Purchase intent expired due to timeout',
      };
    }

    return result;
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
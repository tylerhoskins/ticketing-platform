import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EventService } from './event.service';
import { TicketService } from '../ticket/ticket.service';
import { CreateEventDto, EventResponseDto, EventListQueryDto } from '../../dto/event.dto';
import { PurchaseTicketDto, PurchaseResponseDto } from '../../dto/ticket.dto';

@Controller('events')
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(
    private readonly eventService: EventService,
    private readonly ticketService: TicketService,
  ) {}

  /**
   * Create a new event
   * POST /api/events
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() createEventDto: CreateEventDto): Promise<EventResponseDto> {
    this.logger.log(`Creating event: ${createEventDto.name}`);
    return this.eventService.createEvent(createEventDto);
  }

  /**
   * Get all events with optional filtering
   * GET /api/events?orderBy=date
   */
  @Get()
  async getAllEvents(@Query() query: EventListQueryDto): Promise<EventResponseDto[]> {
    this.logger.log(`Fetching all events with query: ${JSON.stringify(query)}`);
    return this.eventService.getAllEvents(query);
  }

  /**
   * Get upcoming events only
   * GET /api/events/upcoming
   */
  @Get('upcoming')
  async getUpcomingEvents(): Promise<EventResponseDto[]> {
    this.logger.log('Fetching upcoming events');
    return this.eventService.getUpcomingEvents();
  }

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  @Get(':id')
  async getEventById(@Param('id') id: string): Promise<EventResponseDto> {
    this.logger.log(`Fetching event with ID: ${id}`);
    return this.eventService.getEventById(id);
  }

  /**
   * Purchase tickets for an event
   * POST /api/events/:id/purchase
   */
  @Post(':id/purchase')
  @HttpCode(HttpStatus.OK)
  async purchaseTickets(
    @Param('id') eventId: string,
    @Body() purchaseDto: PurchaseTicketDto,
  ): Promise<PurchaseResponseDto> {
    this.logger.log(`Purchase request for event ${eventId}: ${purchaseDto.quantity} tickets`);
    return this.ticketService.purchaseTickets(eventId, purchaseDto);
  }

  /**
   * Get all tickets for an event (admin endpoint)
   * GET /api/events/:id/tickets
   */
  @Get(':id/tickets')
  async getEventTickets(@Param('id') eventId: string) {
    this.logger.log(`Fetching tickets for event: ${eventId}`);
    const tickets = await this.ticketService.getTicketsByEvent(eventId);
    return {
      event_id: eventId,
      total_tickets: tickets.length,
      tickets,
    };
  }
}
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Logger,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketResponseDto } from '../../dto/ticket.dto';
import { 
  IntentStatusDto,
  CancelIntentDto,
  CancelIntentResponseDto 
} from '../../dto/queue.dto';

@Controller('tickets')
export class TicketController {
  private readonly logger = new Logger(TicketController.name);

  constructor(private readonly ticketService: TicketService) {}

  /**
   * Get tickets by purchase ID
   * GET /api/tickets/purchase/:purchaseId
   */
  @Get('purchase/:purchaseId')  
  async getTicketsByPurchase(@Param('purchaseId') purchaseId: string): Promise<TicketResponseDto[]> {
    this.logger.log(`Fetching tickets for purchase ID: ${purchaseId}`);
    return this.ticketService.getTicketsByPurchase(purchaseId);
  }

  /**
   * Get detailed purchase summary
   * GET /api/tickets/purchase/:purchaseId/summary
   */
  @Get('purchase/:purchaseId/summary')
  async getPurchaseSummary(@Param('purchaseId') purchaseId: string) {
    this.logger.log(`Fetching purchase summary for: ${purchaseId}`);
    return this.ticketService.getPurchaseSummary(purchaseId);
  }

  /**
   * Get status of a purchase intent
   * GET /api/tickets/intent/:intentId/status
   */
  @Get('intent/:intentId/status')
  async getIntentStatus(@Param('intentId') intentId: string) {
    this.logger.log(`Fetching intent status for: ${intentId}`);
    return this.ticketService.getIntentStatus(intentId);
  }

  /**
   * Check if a purchase intent has completed
   * GET /api/tickets/intent/:intentId/completion
   */
  @Get('intent/:intentId/completion')
  async checkIntentCompletion(@Param('intentId') intentId: string) {
    this.logger.log(`Checking intent completion for: ${intentId}`);
    return this.ticketService.checkIntentCompletion(intentId);
  }

  /**
   * Get current queue position for a user's intent
   * GET /api/tickets/queue/position
   */
  @Get('queue/position')
  async getQueuePosition(
    @Query('user_session_id') userSessionId: string,
    @Query('event_id') eventId: string
  ) {
    this.logger.log(`Getting queue position for user ${userSessionId} in event ${eventId}`);
    return this.ticketService.getQueuePosition(userSessionId, eventId);
  }

  /**
   * Cancel a purchase intent
   * POST /api/tickets/intent/:intentId/cancel
   */
  @Post('intent/:intentId/cancel')
  async cancelPurchaseIntent(
    @Param('intentId') intentId: string,
    @Body() cancelDto: CancelIntentDto
  ): Promise<CancelIntentResponseDto> {
    this.logger.log(`Canceling intent: ${intentId} for session: ${cancelDto.user_session_id}`);
    
    const result = await this.ticketService.cancelPurchaseIntent(intentId, cancelDto.user_session_id);
    
    return {
      success: result.success,
      message: result.message,
      intent_id: intentId,
      cancelled_at: result.success ? new Date() : undefined,
    };
  }

  /**
   * Get single ticket details
   * GET /api/tickets/:ticketId
   */
  @Get(':ticketId')
  async getTicketById(@Param('ticketId') ticketId: string) {
    this.logger.log(`Fetching ticket details for: ${ticketId}`);
    
    // Since we don't have a direct method to get a single ticket,
    // we'll need to implement this by finding the ticket's purchase
    // This is a placeholder implementation - in a real app, you might
    // want to add a direct ticket lookup method to the repository
    throw new Error('Single ticket lookup not yet implemented. Use purchase ID to get tickets.');
  }
}
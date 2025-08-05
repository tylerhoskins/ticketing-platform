import {
  Controller,
  Get,
  Param,
  Logger,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketResponseDto } from '../../dto/ticket.dto';

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
import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Body, 
  Query,
  BadRequestException, 
  NotFoundException,
  Logger 
} from '@nestjs/common';
import { QueueService } from '../../services/queue.service';
import { PurchaseIntentRepository } from '../../repositories/purchase-intent.repository';
import { EventService } from '../event/event.service';
import {
  IntentStatusDto,
  QueueStatsDto,
  ProcessorHealthDto,
  CancelIntentDto,
  CancelIntentResponseDto,
  UserIntentQueryDto,
  UserIntentsResponseDto,
  BatchQueueOperationDto,
  QueueProcessingResultDto,
  SystemQueueStatsDto
} from '../../dto/queue.dto';
import { PurchaseIntentStatus } from '../../entities/purchase-intent.entity';
import { Ticket } from '../../entities/ticket.entity';

@Controller('queue')
export class QueueController {
  private readonly logger = new Logger(QueueController.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly purchaseIntentRepository: PurchaseIntentRepository,
    private readonly eventService: EventService,
  ) {}

  /**
   * Get status and position of a purchase intent
   * GET /api/queue/intent/:intentId/status
   */
  @Get('intent/:intentId/status')
  async getIntentStatus(@Param('intentId') intentId: string): Promise<IntentStatusDto> {
    this.logger.log(`Getting status for intent: ${intentId}`);

    if (!this.isValidUUID(intentId)) {
      throw new BadRequestException('Invalid intent ID format');
    }

    try {
      // Get the intent
      const intent = await this.purchaseIntentRepository.findById(intentId, ['event']);

      if (!intent) {
        throw new NotFoundException(`Purchase intent ${intentId} not found`);
      }

      // Get queue position if still active
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

      // Build response
      const response: IntentStatusDto = {
        intent_id: intent.id,
        status: intent.status,
        queue_position: queuePosition,
        estimated_wait_time: estimatedWaitTime,
        created_at: intent.created_at,
        updated_at: intent.updated_at,
        requested_quantity: intent.requested_quantity,
        event_id: intent.event_id,
        user_session_id: intent.user_session_id,
      };

      // Add event details
      if (intent.event) {
        response.event = {
          id: intent.event.id,
          name: intent.event.name,
          date: intent.event.date,
          available_tickets: intent.event.available_tickets,
        };
      }

      // Add purchase result if completed
      if (intent.status === PurchaseIntentStatus.COMPLETED) {
        // Get the tickets that were purchased with this intent ID
        try {
          // Get tickets using the event repository (tickets have purchase_id = intent.id)
          const tickets = await this.purchaseIntentRepository.dataSource
            .getRepository(Ticket)
            .find({ where: { purchase_id: intent.id }, relations: ['event'] });
          response.purchase_result = {
            success: true,
            message: `Successfully purchased ${tickets.length} tickets`,
            purchase_id: intent.id,
            tickets_purchased: tickets.length,
          };
        } catch (error) {
          this.logger.warn(`Could not find tickets for completed intent ${intentId}`);
        }
      } else if (intent.status === PurchaseIntentStatus.FAILED) {
        response.purchase_result = {
          success: false,
          message: 'Purchase failed - tickets may no longer be available',
        };
      } else if (intent.status === PurchaseIntentStatus.EXPIRED) {
        response.purchase_result = {
          success: false,
          message: 'Purchase intent expired due to timeout',
        };
      }

      return response;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error getting intent status: ${error}`);
      throw new BadRequestException('Failed to get intent status');
    }
  }

  /**
   * Get queue statistics for an event
   * GET /api/queue/event/:eventId/stats
   */
  @Get('event/:eventId/stats')
  async getEventQueueStats(@Param('eventId') eventId: string): Promise<QueueStatsDto> {
    this.logger.log(`Getting queue stats for event: ${eventId}`);

    if (!this.isValidUUID(eventId)) {
      throw new BadRequestException('Invalid event ID format');
    }

    try {
      // Verify event exists
      const event = await this.eventService.getEventById(eventId);

      // Get queue statistics
      const stats = await this.queueService.getQueueStats(eventId);

      const response: QueueStatsDto = {
        event_id: eventId,
        waiting: stats.waiting,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed,
        expired: stats.expired,
        total_active: stats.totalActive,
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          total_tickets: event.total_tickets,
          available_tickets: event.available_tickets,
        },
      };

      return response;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error getting event queue stats: ${error}`);
      throw new BadRequestException('Failed to get event queue statistics');
    }
  }

  /**
   * Cancel a purchase intent
   * POST /api/queue/intent/:intentId/cancel
   */
  @Post('intent/:intentId/cancel')
  async cancelPurchaseIntent(
    @Param('intentId') intentId: string,
    @Body() cancelDto: CancelIntentDto
  ): Promise<CancelIntentResponseDto> {
    this.logger.log(`Canceling intent: ${intentId} for session: ${cancelDto.user_session_id}`);

    if (!this.isValidUUID(intentId)) {
      throw new BadRequestException('Invalid intent ID format');
    }

    try {
      // Get the intent and verify ownership
      const intent = await this.purchaseIntentRepository.findById(intentId);

      if (!intent) {
        throw new NotFoundException(`Purchase intent ${intentId} not found`);
      }

      if (intent.user_session_id !== cancelDto.user_session_id) {
        throw new BadRequestException('You can only cancel your own purchase intents');
      }

      if (!intent.isActive()) {
        return {
          success: false,
          message: `Cannot cancel intent - current status is ${intent.status}`,
          intent_id: intentId,
        };
      }

      // Cancel the intent by marking it as expired
      const cancelled = await this.purchaseIntentRepository.updateIntentStatus(
        intentId, 
        PurchaseIntentStatus.EXPIRED
      );

      if (cancelled) {
        this.logger.log(`Successfully cancelled intent ${intentId}`);
        return {
          success: true,
          message: 'Purchase intent cancelled successfully',
          intent_id: intentId,
          cancelled_at: new Date(),
        };
      } else {
        return {
          success: false,
          message: 'Failed to cancel purchase intent',
          intent_id: intentId,
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error canceling intent: ${error}`);
      throw new BadRequestException('Failed to cancel purchase intent');
    }
  }

  /**
   * Get queue processor health status
   * GET /api/queue/health
   */
  @Get('health')
  async getProcessorHealth(): Promise<ProcessorHealthDto> {
    try {
      const health = this.queueService.getProcessorHealth();
      
      const response: ProcessorHealthDto = {
        is_running: health.isRunning,
        last_processed_at: health.lastProcessedAt,
        total_processed: health.totalProcessed,
        total_failed: health.totalFailed,
        average_processing_time: health.averageProcessingTime,
      };

      // Calculate success rate
      const total = health.totalProcessed + health.totalFailed;
      if (total > 0) {
        response.success_rate = Math.round((health.totalProcessed / total) * 100);
      }

      return response;
    } catch (error) {
      this.logger.error(`Error getting processor health: ${error}`);
      throw new BadRequestException('Failed to get processor health status');
    }
  }

  /**
   * Get all active intents for a user session
   * GET /api/queue/user/intents
   */
  @Get('user/intents')
  async getUserIntents(@Query() query: UserIntentQueryDto): Promise<UserIntentsResponseDto> {
    this.logger.log(`Getting intents for user session: ${query.user_session_id}`);

    try {
      const intents = query.event_id 
        ? [await this.purchaseIntentRepository.getIntentBySessionAndEvent(query.user_session_id, query.event_id)]
        : await this.purchaseIntentRepository.getActiveIntentsBySession(query.user_session_id);

      const activeIntents = intents.filter(intent => intent !== null);

      const intentDtos = await Promise.all(
        activeIntents.map(async (intent) => {
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
            intent_id: intent.id,
            event_id: intent.event_id,
            event_name: intent.event?.name || 'Unknown Event',
            event_date: intent.event?.date || new Date(),
            status: intent.status,
            queue_position: queuePosition,
            estimated_wait_time: estimatedWaitTime,
            requested_quantity: intent.requested_quantity,
            created_at: intent.created_at,
          };
        })
      );

      return {
        user_session_id: query.user_session_id,
        total_active_intents: intentDtos.length,
        intents: intentDtos,
      };
    } catch (error) {
      this.logger.error(`Error getting user intents: ${error}`);
      throw new BadRequestException('Failed to get user intents');
    }
  }

  /**
   * Force process an event's queue (admin endpoint)
   * POST /api/queue/admin/process
   */
  @Post('admin/process')
  async forceProcessEventQueue(@Body() batchDto: BatchQueueOperationDto): Promise<QueueProcessingResultDto> {
    this.logger.log(`Force processing queue for event: ${batchDto.event_id}`);

    try {
      // Verify event exists
      await this.eventService.getEventById(batchDto.event_id);

      const startTime = Date.now();
      const result = await this.queueService.forceProcessEventQueue(batchDto.event_id);
      const processingTime = Date.now() - startTime;

      const totalAttempts = result.processed + result.failed;
      const successRate = totalAttempts > 0 ? Math.round((result.processed / totalAttempts) * 100) : 0;

      return {
        event_id: batchDto.event_id,
        processed: result.processed,
        failed: result.failed,
        total_attempts: totalAttempts,
        processing_time: processingTime,
        success_rate: successRate,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error force processing queue: ${error}`);
      throw new BadRequestException('Failed to process event queue');
    }
  }

  /**
   * Get system-wide queue statistics
   * GET /api/queue/system/stats
   */
  @Get('system/stats')
  async getSystemQueueStats(): Promise<SystemQueueStatsDto> {
    this.logger.log('Getting system-wide queue statistics');

    try {
      const [totalActive, processorHealth] = await Promise.all([
        this.purchaseIntentRepository.getTotalActiveIntents(),
        this.queueService.getProcessorHealth(),
      ]);

      // Count total waiting and processing across all events
      // This is a simplified approach - in production, you'd want a more efficient query
      let totalWaiting = 0;
      let totalProcessing = 0;
      let eventsWithQueues = 0;

      // For now, we'll estimate these values
      // In a real implementation, you'd want dedicated queries for this
      
      const response: SystemQueueStatsDto = {
        total_active_intents: totalActive,
        total_waiting: totalWaiting,
        total_processing: totalProcessing,
        events_with_queues: eventsWithQueues,
        processor_health: {
          is_running: processorHealth.isRunning,
          last_processed_at: processorHealth.lastProcessedAt,
          total_processed: processorHealth.totalProcessed,
          total_failed: processorHealth.totalFailed,
          average_processing_time: processorHealth.averageProcessingTime,
          success_rate: processorHealth.totalProcessed + processorHealth.totalFailed > 0
            ? Math.round((processorHealth.totalProcessed / (processorHealth.totalProcessed + processorHealth.totalFailed)) * 100)
            : undefined,
        },
        last_updated: new Date(),
      };

      return response;
    } catch (error) {
      this.logger.error(`Error getting system queue stats: ${error}`);
      throw new BadRequestException('Failed to get system queue statistics');
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
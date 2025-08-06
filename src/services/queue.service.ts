import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurchaseIntentRepository } from '../repositories/purchase-intent.repository';
import { EventRepository } from '../repositories/event.repository';
import { PurchaseIntent, PurchaseIntentStatus } from '../entities/purchase-intent.entity';

interface QueueStats {
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  expired: number;
  totalActive: number;
}

interface ProcessorHealth {
  isRunning: boolean;
  lastProcessedAt?: Date;
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private isProcessorRunning = false;
  private processingStats = {
    totalProcessed: 0,
    totalFailed: 0,
    processingTimes: [] as number[],
    lastProcessedAt: undefined as Date | undefined,
  };
  
  // Configuration
  private readonly PROCESSING_INTERVAL_MS = 2000; // Process every 2 seconds
  private readonly MAX_CONCURRENT_PROCESSING = 5; // Process up to 5 intents simultaneously
  private readonly INTENT_EXPIRY_MINUTES = 30; // Expire intents after 30 minutes
  private readonly MAX_PROCESSING_TIME_MS = 30000; // 30 seconds max per intent
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    private readonly purchaseIntentRepository: PurchaseIntentRepository,
    private readonly eventRepository: EventRepository,
  ) {}

  async onModuleInit() {
    this.logger.log('Queue processor starting...');
    await this.startQueueProcessor();
  }

  async onModuleDestroy() {
    this.logger.log('Queue processor stopping...');
    await this.stopQueueProcessor();
  }

  /**
   * Start the background queue processor
   */
  async startQueueProcessor(): Promise<void> {
    if (this.isProcessorRunning) {
      this.logger.warn('Queue processor is already running');
      return;
    }

    this.isProcessorRunning = true;
    this.logger.log('Queue processor started successfully');
  }

  /**
   * Stop the background queue processor gracefully
   */
  async stopQueueProcessor(): Promise<void> {
    if (!this.isProcessorRunning) {
      this.logger.warn('Queue processor is not running');
      return;
    }

    this.isProcessorRunning = false;
    this.logger.log('Queue processor stopped successfully');
  }

  /**
   * Cron job to process queue every 2 seconds
   */
  @Cron('*/2 * * * * *') // Every 2 seconds
  async processQueues(): Promise<void> {
    if (!this.isProcessorRunning) {
      return;
    }

    try {
      // Get all events that have pending intents
      const eventsWithIntents = await this.getEventsWithPendingIntents();
      
      if (eventsWithIntents.length === 0) {
        return;
      }

      this.logger.debug(`Processing queues for ${eventsWithIntents.length} events`);

      // Process each event's queue
      const processingPromises = eventsWithIntents.map(eventId => 
        this.processEventQueue(eventId).catch(error => {
          this.logger.error(`Failed to process queue for event ${eventId}:`, error);
        })
      );

      await Promise.all(processingPromises);
    } catch (error) {
      this.logger.error('Error in queue processing cron job:', error);
    }
  }

  /**
   * Cron job to clean up expired intents every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredIntents(): Promise<void> {
    try {
      const expiredCount = await this.expireOldIntents();
      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} old purchase intents`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired intents:', error);
    }
  }

  /**
   * Process all pending intents for a specific event
   */
  async processEventQueue(eventId: string): Promise<void> {
    try {
      // Get next batch of intents to process for this event
      const intents = await this.purchaseIntentRepository.getNextIntentsToProcess(
        eventId, 
        this.MAX_CONCURRENT_PROCESSING
      );

      if (intents.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${intents.length} intents for event ${eventId}`);

      // Process intents in parallel (but maintain FIFO order by timestamp)
      const processingPromises = intents.map(intent => 
        this.processIntent(intent).catch(error => {
          this.logger.error(`Failed to process intent ${intent.id}:`, error);
          // Mark as failed if processing throws an error
          return this.purchaseIntentRepository.updateIntentStatus(intent.id, PurchaseIntentStatus.FAILED);
        })
      );

      await Promise.all(processingPromises);
    } catch (error) {
      this.logger.error(`Error processing queue for event ${eventId}:`, error);
    }
  }

  /**
   * Process a single purchase intent
   */
  async processIntent(intent: PurchaseIntent): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Processing intent ${intent.id} for event ${intent.event_id}`);

      // Mark intent as processing (atomic operation)
      const marked = await this.purchaseIntentRepository.markIntentAsProcessing(intent.id);
      if (!marked) {
        this.logger.debug(`Intent ${intent.id} was already being processed or completed`);
        return;
      }

      // Check if intent has expired
      if (intent.shouldExpire(this.INTENT_EXPIRY_MINUTES)) {
        await this.purchaseIntentRepository.updateIntentStatus(intent.id, PurchaseIntentStatus.EXPIRED);
        this.logger.debug(`Intent ${intent.id} expired during processing`);
        return;
      }

      // Execute the actual ticket purchase with retry logic
      let lastError: Error | null = null;
      let attempts = 0;

      while (attempts < this.MAX_RETRY_ATTEMPTS) {
        attempts++;
        
        try {
          const result = await Promise.race([
            this.executePurchase(intent),
            this.timeoutPromise(this.MAX_PROCESSING_TIME_MS)
          ]);

          if (result.success) {
            await this.purchaseIntentRepository.updateIntentStatus(intent.id, PurchaseIntentStatus.COMPLETED);
            
            const processingTime = Date.now() - startTime;
            this.updateProcessingStats(true, processingTime);
            
            this.logger.log(`Successfully processed intent ${intent.id} for ${intent.requested_quantity} tickets (${processingTime}ms)`);
            return;
          } else {
            // Business logic failure (e.g., not enough tickets)
            await this.purchaseIntentRepository.updateIntentStatus(intent.id, PurchaseIntentStatus.FAILED);
            this.logger.warn(`Intent ${intent.id} failed: ${result.message}`);
            return;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          this.logger.warn(`Attempt ${attempts} failed for intent ${intent.id}: ${lastError.message}`);
          
          // Wait before retry (exponential backoff)
          if (attempts < this.MAX_RETRY_ATTEMPTS) {
            await this.delay(Math.pow(2, attempts) * 1000);
          }
        }
      }

      // All attempts failed
      await this.purchaseIntentRepository.updateIntentStatus(intent.id, PurchaseIntentStatus.FAILED);
      this.updateProcessingStats(false, Date.now() - startTime);
      this.logger.error(`Intent ${intent.id} failed after ${attempts} attempts. Last error: ${lastError?.message}`);

    } catch (error) {
      // Unexpected error in processing logic
      await this.purchaseIntentRepository.updateIntentStatus(intent.id, PurchaseIntentStatus.FAILED);
      this.updateProcessingStats(false, Date.now() - startTime);
      this.logger.error(`Unexpected error processing intent ${intent.id}:`, error);
    }
  }

  /**
   * Execute the actual ticket purchase
   */
  private async executePurchase(intent: PurchaseIntent): Promise<{ success: boolean; message: string }> {
    return this.eventRepository.purchaseTickets(
      intent.event_id,
      intent.requested_quantity,
      intent.id // Use intent ID as purchase ID
    );
  }

  /**
   * Get list of events that have pending intents
   */
  private async getEventsWithPendingIntents(): Promise<string[]> {
    // This would be more efficient with a custom query, but for now we can use the repository
    const totalActive = await this.purchaseIntentRepository.getTotalActiveIntents();
    if (totalActive === 0) {
      return [];
    }

    // For now, we'll get all events and check which have pending intents
    // In a production system, this should be a more efficient query
    const allEvents = await this.eventRepository.findAll();
    const eventsWithIntents: string[] = [];

    for (const event of allEvents) {
      const stats = await this.purchaseIntentRepository.getEventQueueStats(event.id);
      if (stats.totalActive > 0) {
        eventsWithIntents.push(event.id);
      }
    }

    return eventsWithIntents;
  }

  /**
   * Expire old purchase intents
   */
  async expireOldIntents(maxAgeMinutes: number = this.INTENT_EXPIRY_MINUTES): Promise<number> {
    try {
      return await this.purchaseIntentRepository.cleanupExpiredIntents(maxAgeMinutes);
    } catch (error) {
      this.logger.error('Error expiring old intents:', error);
      return 0;
    }
  }

  /**
   * Get queue statistics for a specific event
   */
  async getQueueStats(eventId: string): Promise<QueueStats> {
    return this.purchaseIntentRepository.getEventQueueStats(eventId);
  }

  /**
   * Get processor health information
   */
  getProcessorHealth(): ProcessorHealth {
    const avgTime = this.processingStats.processingTimes.length > 0
      ? this.processingStats.processingTimes.reduce((a, b) => a + b, 0) / this.processingStats.processingTimes.length
      : 0;

    return {
      isRunning: this.isProcessorRunning,
      lastProcessedAt: this.processingStats.lastProcessedAt,
      totalProcessed: this.processingStats.totalProcessed,
      totalFailed: this.processingStats.totalFailed,
      averageProcessingTime: Math.round(avgTime),
    };
  }

  /**
   * Force process a specific event's queue (admin functionality)
   */
  async forceProcessEventQueue(eventId: string): Promise<{ processed: number; failed: number }> {
    this.logger.log(`Force processing queue for event ${eventId}`);
    
    const intents = await this.purchaseIntentRepository.getNextIntentsToProcess(eventId, 100);
    let processed = 0;
    let failed = 0;

    for (const intent of intents) {
      try {
        await this.processIntent(intent);
        processed++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to force process intent ${intent.id}:`, error);
      }
    }

    this.logger.log(`Force processing completed for event ${eventId}: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(success: boolean, processingTime: number): void {
    this.processingStats.lastProcessedAt = new Date();
    
    if (success) {
      this.processingStats.totalProcessed++;
    } else {
      this.processingStats.totalFailed++;
    }

    // Keep only last 100 processing times for average calculation
    this.processingStats.processingTimes.push(processingTime);
    if (this.processingStats.processingTimes.length > 100) {
      this.processingStats.processingTimes.shift();
    }
  }

  /**
   * Create a timeout promise for processing time limits
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Processing timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
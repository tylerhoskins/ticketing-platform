import { Injectable } from '@nestjs/common';
import { Repository, DataSource, LessThan, In } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { PurchaseIntent, PurchaseIntentStatus } from '../entities/purchase-intent.entity';

export interface CreateIntentData {
  eventId: string;
  userSessionId: string;
  requestedQuantity: number;
}

export interface QueuePosition {
  position: number;
  totalAhead: number;
  estimatedWaitTime?: number;
}

@Injectable()
export class PurchaseIntentRepository {
  constructor(
    @InjectRepository(PurchaseIntent)
    private readonly purchaseIntentRepository: Repository<PurchaseIntent>,
    @InjectDataSource()
    public readonly dataSource: DataSource, // Make public so controllers can access it
  ) {}

  /**
   * Register a new purchase intent in the queue
   */
  async createIntent(data: CreateIntentData): Promise<PurchaseIntent> {
    const intent = this.purchaseIntentRepository.create({
      event_id: data.eventId,
      user_session_id: data.userSessionId,
      requested_quantity: data.requestedQuantity,
      request_timestamp: PurchaseIntent.generateTimestamp(),
      status: PurchaseIntentStatus.WAITING,
    });

    return this.purchaseIntentRepository.save(intent);
  }

  /**
   * Get user's position in queue for a specific event
   */
  async getQueuePosition(
    userSessionId: string,
    eventId: string,
  ): Promise<QueuePosition | null> {
    // Find the user's intent
    const userIntent = await this.purchaseIntentRepository.findOne({
      where: {
        user_session_id: userSessionId,
        event_id: eventId,
        status: In([PurchaseIntentStatus.WAITING, PurchaseIntentStatus.PROCESSING]),
      },
    });

    if (!userIntent) {
      return null;
    }

    // Count how many intents are ahead of this user for the same event
    const intentsAhead = await this.purchaseIntentRepository.count({
      where: {
        event_id: eventId,
        status: In([PurchaseIntentStatus.WAITING, PurchaseIntentStatus.PROCESSING]),
        request_timestamp: LessThan(userIntent.request_timestamp),
      },
    });

    // Position is 1-based (1st in queue, 2nd in queue, etc.)
    const position = intentsAhead + 1;

    return {
      position,
      totalAhead: intentsAhead,
      // Rough estimate: assume 30 seconds per intent processing
      estimatedWaitTime: intentsAhead * 30,
    };
  }

  /**
   * Get the next purchase intents to process in timestamp order
   */
  async getNextIntentsToProcess(
    eventId: string,
    limit: number = 10,
  ): Promise<PurchaseIntent[]> {
    return this.purchaseIntentRepository.find({
      where: {
        event_id: eventId,
        status: PurchaseIntentStatus.WAITING,
      },
      order: {
        request_timestamp: 'ASC', // First-come-first-served
      },
      take: limit,
    });
  }

  /**
   * Update the status of a purchase intent
   */
  async updateIntentStatus(
    intentId: string,
    status: PurchaseIntentStatus,
  ): Promise<boolean> {
    const result = await this.purchaseIntentRepository.update(
      { id: intentId },
      { status, updated_at: new Date() },
    );

    return (result.affected || 0) > 0;
  }

  /**
   * Clean up expired purchase intents
   */
  async cleanupExpiredIntents(maxAgeMinutes: number = 30): Promise<number> {
    const cutoffTime = Date.now() - maxAgeMinutes * 60 * 1000;
    const cutoffTimestamp = (cutoffTime * 1000).toString(); // Convert to microseconds

    const result = await this.purchaseIntentRepository.update(
      {
        status: PurchaseIntentStatus.WAITING,
        request_timestamp: LessThan(cutoffTimestamp),
      },
      {
        status: PurchaseIntentStatus.EXPIRED,
        updated_at: new Date(),
      },
    );

    return result.affected || 0;
  }

  /**
   * Get all intents for a specific event
   */
  async getIntentsByEvent(
    eventId: string,
    status?: PurchaseIntentStatus,
  ): Promise<PurchaseIntent[]> {
    const whereCondition: any = { event_id: eventId };
    if (status) {
      whereCondition.status = status;
    }

    return this.purchaseIntentRepository.find({
      where: whereCondition,
      order: {
        request_timestamp: 'ASC',
      },
      relations: ['event'],
    });
  }

  /**
   * Find existing intent for a user and event combination
   */
  async getIntentBySessionAndEvent(
    userSessionId: string,
    eventId: string,
  ): Promise<PurchaseIntent | null> {
    return this.purchaseIntentRepository.findOne({
      where: {
        user_session_id: userSessionId,
        event_id: eventId,
        status: In([
          PurchaseIntentStatus.WAITING,
          PurchaseIntentStatus.PROCESSING,
        ]),
      },
      relations: ['event'],
    });
  }

  /**
   * Get queue statistics for an event
   */
  async getEventQueueStats(eventId: string): Promise<{
    waiting: number;
    processing: number;
    completed: number;
    failed: number;
    expired: number;
    totalActive: number;
  }> {
    const [waiting, processing, completed, failed, expired] = await Promise.all([
      this.purchaseIntentRepository.count({
        where: { event_id: eventId, status: PurchaseIntentStatus.WAITING },
      }),
      this.purchaseIntentRepository.count({
        where: { event_id: eventId, status: PurchaseIntentStatus.PROCESSING },
      }),
      this.purchaseIntentRepository.count({
        where: { event_id: eventId, status: PurchaseIntentStatus.COMPLETED },
      }),
      this.purchaseIntentRepository.count({
        where: { event_id: eventId, status: PurchaseIntentStatus.FAILED },
      }),
      this.purchaseIntentRepository.count({
        where: { event_id: eventId, status: PurchaseIntentStatus.EXPIRED },
      }),
    ]);

    return {
      waiting,
      processing,
      completed,
      failed,
      expired,
      totalActive: waiting + processing,
    };
  }

  /**
   * Mark an intent as processing (atomic operation)
   */
  async markIntentAsProcessing(intentId: string): Promise<boolean> {
    const result = await this.purchaseIntentRepository.update(
      {
        id: intentId,
        status: PurchaseIntentStatus.WAITING, // Only update if still waiting
      },
      {
        status: PurchaseIntentStatus.PROCESSING,
        updated_at: new Date(),
      },
    );

    return (result.affected || 0) > 0;
  }

  /**
   * Get all active intents for a user session across all events
   */
  async getActiveIntentsBySession(userSessionId: string): Promise<PurchaseIntent[]> {
    return this.purchaseIntentRepository.find({
      where: {
        user_session_id: userSessionId,
        status: In([PurchaseIntentStatus.WAITING, PurchaseIntentStatus.PROCESSING]),
      },
      relations: ['event'],
      order: {
        request_timestamp: 'ASC',
      },
    });
  }

  /**
   * Count total active intents in the system (for monitoring)
   */
  async getTotalActiveIntents(): Promise<number> {
    return this.purchaseIntentRepository.count({
      where: {
        status: In([PurchaseIntentStatus.WAITING, PurchaseIntentStatus.PROCESSING]),
      },
    });
  }

  /**
   * Batch update multiple intents (useful for processing queues)
   */
  async batchUpdateIntentStatus(
    intentIds: string[],
    status: PurchaseIntentStatus,
  ): Promise<number> {
    const result = await this.purchaseIntentRepository.update(
      { id: In(intentIds) },
      { status, updated_at: new Date() },
    );

    return result.affected || 0;
  }

  /**
   * Find an intent by ID with optional relations
   */
  async findById(intentId: string, relations: string[] = []): Promise<PurchaseIntent | null> {
    return this.purchaseIntentRepository.findOne({
      where: { id: intentId },
      relations,
    });
  }
}
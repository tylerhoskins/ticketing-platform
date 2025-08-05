import { Injectable } from '@nestjs/common';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Find all events, optionally ordered by date
   */
  async findAll(orderBy: 'date' | 'created_at' = 'date'): Promise<Event[]> {
    return this.eventRepository.find({
      order: { [orderBy]: 'ASC' },
    });
  }

  /**
   * Find event by ID
   */
  async findById(id: string): Promise<Event | null> {
    return this.eventRepository.findOne({ where: { id } });
  }

  /**
   * Create a new event
   */
  async create(eventData: Partial<Event>): Promise<Event> {
    const event = this.eventRepository.create(eventData);
    return this.eventRepository.save(event);
  }

  /**
   * Purchase tickets with proper concurrency control using pessimistic locking
   * This method uses a database transaction with row-level locking to prevent
   * race conditions during concurrent ticket purchases.
   */
  async purchaseTickets(
    eventId: string,
    quantity: number,
    purchaseId: string,
  ): Promise<{ success: boolean; message: string; tickets?: Ticket[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use pessimistic write lock to prevent concurrent modifications
      const event = await queryRunner.manager.findOne(Event, {
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!event) {
        await queryRunner.rollbackTransaction();
        return { success: false, message: 'Event not found' };
      }

      // Check ticket availability
      if (event.available_tickets < quantity) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          message: `Only ${event.available_tickets} tickets available`,
        };
      }

      // Update event ticket count with optimistic locking check
      const updateResult = await queryRunner.manager.update(
        Event,
        { id: eventId, version: event.version },
        {
          available_tickets: event.available_tickets - quantity,
          version: event.version + 1,
        },
      );

      // Check if optimistic locking failed (version mismatch)
      if (updateResult.affected === 0) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          message: 'Ticket availability changed, please try again',
        };
      }

      // Create ticket records
      const tickets: Ticket[] = [];
      for (let i = 0; i < quantity; i++) {
        const ticket = queryRunner.manager.create(Ticket, {
          event_id: eventId,
          purchase_id: purchaseId,
        });
        tickets.push(await queryRunner.manager.save(ticket));
      }

      await queryRunner.commitTransaction();
      return { success: true, message: 'Tickets purchased successfully', tickets };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        message: 'Failed to purchase tickets due to system error',
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get tickets for a specific purchase
   */
  async getTicketsByPurchase(purchaseId: string): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { purchase_id: purchaseId },
      relations: ['event'],
    });
  }

  /**
   * Get all tickets for an event
   */
  async getTicketsByEvent(eventId: string): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { event_id: eventId },
      order: { purchased_at: 'DESC' },
    });
  }
}
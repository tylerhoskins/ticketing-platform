import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('tickets')
@Index(['event_id']) // Index for efficient queries by event
@Index(['purchase_id']) // Index for grouping tickets by purchase
@Index(['purchased_at']) // Index for time-based queries
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: false })
  @Index() // Foreign key index for performance
  event_id!: string;

  /**
   * Purchase ID to group multiple tickets bought in a single transaction.
   * This allows tracking which tickets were purchased together.
   */
  @Column({ type: 'uuid', nullable: false })
  @Index() // Index for grouping tickets by purchase
  purchase_id!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @Index() // Index for time-based queries
  purchased_at!: Date;

  // Relationship to event (many tickets belong to one event)
  @ManyToOne(() => Event, (event) => event.tickets, {
    onDelete: 'CASCADE', // If event is deleted, tickets are also deleted
    nullable: false,
  })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  /**
   * Business logic method to check if ticket was purchased recently
   */
  isPurchasedWithin(minutes: number): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - this.purchased_at.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff <= minutes;
  }
}
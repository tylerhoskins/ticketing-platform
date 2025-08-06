import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Event } from './event.entity';

export enum PurchaseIntentStatus {
  WAITING = 'waiting',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Entity('purchase_intents')
@Check('requested_quantity > 0')
@Check('requested_quantity <= 100') // Reasonable upper limit
@Index(['event_id', 'request_timestamp']) // Composite index for efficient queue processing
@Index(['status']) // Index for filtering active intents
@Index(['user_session_id']) // Index for user lookups
@Index(['request_timestamp']) // Additional index for timestamp ordering
export class PurchaseIntent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: false })
  @Index() // Foreign key index for performance
  event_id!: string;

  /**
   * User session identifier to track purchase intents per user session.
   * This allows preventing duplicate intents and tracking user position in queue.
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index() // Index for efficient user session lookups
  user_session_id!: string;

  @Column({ type: 'integer', nullable: false })
  requested_quantity!: number;

  /**
   * Microsecond precision timestamp for fair queue ordering.
   * Using bigint to store microseconds since Unix epoch for precise ordering.
   */
  @Column({ type: 'bigint', nullable: false })
  @Index() // Index for efficient timestamp-based ordering
  request_timestamp!: string;

  @Column({
    type: 'enum',
    enum: PurchaseIntentStatus,
    default: PurchaseIntentStatus.WAITING,
    nullable: false,
  })
  @Index() // Index for efficient status filtering
  status!: PurchaseIntentStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  // Relationship to event (many purchase intents belong to one event)
  @ManyToOne(() => Event, (event) => event.tickets, {
    onDelete: 'CASCADE', // If event is deleted, purchase intents are also deleted
    nullable: false,
  })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  /**
   * Static method to generate microsecond precision timestamp
   */
  static generateTimestamp(): string {
    const now = Date.now();
    const microseconds = now * 1000; // Convert milliseconds to microseconds
    return microseconds.toString();
  }

  /**
   * Business logic method to check if intent is active (waiting or processing)
   */
  isActive(): boolean {
    return (
      this.status === PurchaseIntentStatus.WAITING ||
      this.status === PurchaseIntentStatus.PROCESSING
    );
  }

  /**
   * Business logic method to check if intent is completed
   */
  isCompleted(): boolean {
    return (
      this.status === PurchaseIntentStatus.COMPLETED ||
      this.status === PurchaseIntentStatus.FAILED ||
      this.status === PurchaseIntentStatus.EXPIRED
    );
  }

  /**
   * Business logic method to check if intent should be expired
   */
  shouldExpire(maxAgeMinutes: number = 30): boolean {
    const now = Date.now();
    const intentTime = parseInt(this.request_timestamp) / 1000; // Convert back to milliseconds
    const ageMinutes = (now - intentTime) / (1000 * 60);
    return ageMinutes > maxAgeMinutes && this.status === PurchaseIntentStatus.WAITING;
  }

  /**
   * Business logic method to get intent age in minutes
   */
  getAgeInMinutes(): number {
    const now = Date.now();
    const intentTime = parseInt(this.request_timestamp) / 1000; // Convert back to milliseconds
    return (now - intentTime) / (1000 * 60);
  }
}
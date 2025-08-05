import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  VersionColumn,
  Check,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('events')
@Check('available_tickets >= 0')
@Check('total_tickets >= 0')
@Check('available_tickets <= total_tickets')
@Index(['date']) // Index for efficient event listing by date
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'timestamp with time zone', nullable: false })
  @Index() // Index for date-based queries
  date!: Date;

  @Column({ type: 'integer', nullable: false })
  total_tickets!: number;

  @Column({ type: 'integer', nullable: false })
  available_tickets!: number;

  /**
   * Version field for optimistic locking to prevent race conditions
   * during concurrent ticket purchases
   */
  @VersionColumn()
  version!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  // Relationship to tickets (one event can have many tickets)
  @OneToMany(() => Ticket, (ticket) => ticket.event, { cascade: true })
  tickets!: Ticket[];

  /**
   * Business logic method to check if tickets are available
   */
  hasAvailableTickets(quantity: number = 1): boolean {
    return this.available_tickets >= quantity;
  }

  /**
   * Business logic method to calculate sold tickets
   */
  get soldTickets(): number {
    return this.total_tickets - this.available_tickets;
  }

  /**
   * Business logic method to check if event is sold out
   */
  get isSoldOut(): boolean {
    return this.available_tickets === 0;
  }
}
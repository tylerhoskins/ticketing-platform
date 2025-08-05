import { IsString, IsNotEmpty, IsDateString, IsInt, Min, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'Event name must not exceed 255 characters' })
  name!: string;

  @IsDateString({}, { message: 'Date must be a valid ISO 8601 date string' })
  @Transform(({ value }) => {
    const date = new Date(value);
    if (date <= new Date()) {
      throw new Error('Event date must be in the future');
    }
    return value;
  })
  date!: string;

  @IsInt({ message: 'Total tickets must be an integer' })
  @Min(1, { message: 'Total tickets must be at least 1' })
  @Type(() => Number)
  total_tickets!: number;
}

export class EventResponseDto {
  id!: string;
  name!: string;
  date!: Date;
  total_tickets!: number;
  available_tickets!: number;
  created_at!: Date;
  updated_at!: Date;
  version!: number;

  /**
   * Computed properties for client convenience
   */
  get soldTickets(): number {
    return this.total_tickets - this.available_tickets;
  }

  get isSoldOut(): boolean {
    return this.available_tickets === 0;
  }

  get isUpcoming(): boolean {
    return new Date(this.date) > new Date();
  }
}

export class EventListQueryDto {
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  orderBy?: 'date' | 'created_at' = 'date';
}
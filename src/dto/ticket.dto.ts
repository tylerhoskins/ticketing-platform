import { IsInt, Min, Max, IsUUID, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseTicketDto {
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10, { message: 'Cannot purchase more than 10 tickets at once' })
  @Type(() => Number)
  quantity!: number;
}

export class TicketResponseDto {
  id!: string;
  event_id!: string;
  purchase_id!: string;
  purchased_at!: Date;
  
  // Include event details for convenience
  event?: {
    id: string;
    name: string;
    date: Date;
  };
}

export class PurchaseResponseDto {
  success!: boolean;
  message!: string;
  purchase_id?: string;
  tickets?: TicketResponseDto[];
  total_purchased?: number;
}

export class TicketQueryDto {
  @IsUUID(4, { message: 'Purchase ID must be a valid UUID' })
  @IsOptional()
  purchase_id?: string;

  @IsUUID(4, { message: 'Event ID must be a valid UUID' })  
  @IsOptional()
  event_id?: string;
}
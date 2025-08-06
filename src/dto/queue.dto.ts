import { IsInt, Min, Max, IsUUID, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseIntentStatus } from '../entities/purchase-intent.entity';

/**
 * DTO for creating a purchase intent
 */
export class CreatePurchaseIntentDto {
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10, { message: 'Cannot purchase more than 10 tickets at once' })
  @Type(() => Number)
  quantity!: number;

  @IsString({ message: 'User session ID must be a string' })
  @MinLength(1, { message: 'User session ID cannot be empty' })
  @MaxLength(255, { message: 'User session ID too long' })
  user_session_id!: string;
}

/**
 * Response DTO when a purchase intent is created
 */
export class PurchaseIntentResponseDto {
  success!: boolean;
  message!: string;
  intent_id?: string;
  queue_position?: number;
  estimated_wait_time?: number; // in seconds
  event_id?: string;
  requested_quantity?: number;
  created_at?: Date;
}

/**
 * DTO for checking intent status
 */
export class IntentStatusDto {
  intent_id!: string;
  status!: PurchaseIntentStatus;
  queue_position?: number;
  estimated_wait_time?: number; // in seconds
  created_at!: Date;
  updated_at!: Date;
  requested_quantity!: number;
  event_id!: string;
  user_session_id!: string;
  
  // Event details for convenience
  event?: {
    id: string;
    name: string;
    date: Date;
    available_tickets: number;
  };

  // If completed, include purchase details
  purchase_result?: {
    success: boolean;
    message: string;
    purchase_id?: string;
    tickets_purchased?: number;
  };
}

/**
 * DTO for queue statistics
 */
export class QueueStatsDto {
  event_id!: string;
  waiting!: number;
  processing!: number;
  completed!: number;
  failed!: number;
  expired!: number;
  total_active!: number;
  
  // Event details
  event?: {
    id: string;
    name: string;
    date: Date;
    total_tickets: number;
    available_tickets: number;
  };
}

/**
 * DTO for when an intent is completed (success or failure)
 */
export class IntentCompletionDto {
  intent_id!: string;
  status!: PurchaseIntentStatus;
  success!: boolean;
  message!: string;
  completed_at!: Date;
  processing_time?: number; // in milliseconds
  
  // If successful, include ticket details
  purchase_id?: string;
  tickets?: Array<{
    id: string;
    event_id: string;
    purchased_at: Date;
  }>;
  total_tickets_purchased?: number;

  // Event details
  event?: {
    id: string;
    name: string;
    date: Date;
  };
}

/**
 * DTO for processor health status
 */
export class ProcessorHealthDto {
  is_running!: boolean;
  last_processed_at?: Date;
  total_processed!: number;
  total_failed!: number;
  average_processing_time!: number; // in milliseconds
  success_rate?: number; // percentage
}

/**
 * DTO for queue processing results (admin)
 */
export class QueueProcessingResultDto {
  event_id!: string;
  processed!: number;
  failed!: number;
  total_attempts!: number;
  processing_time!: number; // in milliseconds
  success_rate!: number; // percentage
}

/**
 * Query DTO for getting user's intents
 */
export class UserIntentQueryDto {
  @IsString({ message: 'User session ID must be a string' })
  @MinLength(1, { message: 'User session ID cannot be empty' })
  user_session_id!: string;

  @IsUUID(4, { message: 'Event ID must be a valid UUID' })
  @IsOptional()
  event_id?: string;
}

/**
 * Response DTO for user's active intents
 */
export class UserIntentsResponseDto {
  user_session_id!: string;
  total_active_intents!: number;
  intents!: Array<{
    intent_id: string;
    event_id: string;
    event_name: string;
    event_date: Date;
    status: PurchaseIntentStatus;
    queue_position?: number;
    estimated_wait_time?: number;
    requested_quantity: number;
    created_at: Date;
  }>;
}

/**
 * DTO for canceling a purchase intent
 */
export class CancelIntentDto {
  @IsUUID(4, { message: 'Intent ID must be a valid UUID' })
  intent_id!: string;

  @IsString({ message: 'User session ID must be a string' })
  @MinLength(1, { message: 'User session ID cannot be empty' })
  user_session_id!: string;
}

/**
 * Response DTO for intent cancellation
 */
export class CancelIntentResponseDto {
  success!: boolean;
  message!: string;
  intent_id!: string;
  cancelled_at?: Date;
}

/**
 * DTO for batch queue operations (admin)
 */
export class BatchQueueOperationDto {
  @IsUUID(4, { message: 'Event ID must be a valid UUID' })
  event_id!: string;

  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;
}

/**
 * System-wide queue statistics DTO
 */
export class SystemQueueStatsDto {
  total_active_intents!: number;
  total_waiting!: number;
  total_processing!: number;
  events_with_queues!: number;
  processor_health!: ProcessorHealthDto;
  last_updated!: Date;
}
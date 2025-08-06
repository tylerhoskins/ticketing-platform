import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueController } from './queue.controller';
import { QueueService } from '../../services/queue.service';
import { PurchaseIntentRepository } from '../../repositories/purchase-intent.repository';
import { EventRepository } from '../../repositories/event.repository';
import { PurchaseIntent } from '../../entities/purchase-intent.entity';
import { Event } from '../../entities/event.entity';
import { Ticket } from '../../entities/ticket.entity';
import { EventModule } from '../event/event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseIntent, Event, Ticket]),
    ScheduleModule.forRoot(), // Enable cron jobs for background processing
    EventModule, // Import EventModule to access EventService
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    PurchaseIntentRepository,
    EventRepository,
  ],
  exports: [
    QueueService,
    PurchaseIntentRepository,
  ],
})
export class QueueModule {}
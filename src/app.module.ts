import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { EventModule } from './modules/event/event.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { HealthModule } from './modules/health/health.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(), // Enable cron jobs globally
    EventModule, 
    TicketModule,
    HealthModule,
    QueueModule, // Add the new QueueModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { EventModule } from './modules/event/event.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    DatabaseModule,
    EventModule, 
    TicketModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
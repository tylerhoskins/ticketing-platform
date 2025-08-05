import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { TicketService } from '../ticket/ticket.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EventController],
  providers: [EventService, TicketService],
  exports: [EventService],
})
export class EventModule {}
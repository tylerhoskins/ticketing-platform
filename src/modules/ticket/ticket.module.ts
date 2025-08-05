import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { EventService } from '../event/event.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TicketController],
  providers: [TicketService, EventService],
  exports: [TicketService],
})
export class TicketModule {}
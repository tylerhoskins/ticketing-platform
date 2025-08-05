import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '../config/database.config';
import { Event, Ticket } from '../entities';
import { EventRepository } from '../repositories/event.repository';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([Event, Ticket]),
  ],
  providers: [EventRepository],
  exports: [TypeOrmModule, EventRepository],
})
export class DatabaseModule {}
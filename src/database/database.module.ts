import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '../config/database.config';
import { Event, Ticket, PurchaseIntent } from '../entities';
import { EventRepository } from '../repositories/event.repository';
import { PurchaseIntentRepository } from '../repositories/purchase-intent.repository';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([Event, Ticket, PurchaseIntent]),
  ],
  providers: [EventRepository, PurchaseIntentRepository],
  exports: [TypeOrmModule, EventRepository, PurchaseIntentRepository],
})
export class DatabaseModule {}
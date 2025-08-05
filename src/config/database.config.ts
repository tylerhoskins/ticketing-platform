import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Ticket } from '../entities/ticket.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'app_db',
  entities: [Event, Ticket],
  synchronize: false, // Use migrations for production safety
  logging: process.env.NODE_ENV === 'development',
  // Connection pool settings optimized for concurrent ticket purchases
  extra: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    // Prevent connection timeout during high concurrency
    idleTimeoutMillis: 30000,
  },
};
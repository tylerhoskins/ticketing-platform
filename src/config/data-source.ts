import { DataSource } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Ticket } from '../entities/ticket.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'app_db',
  synchronize: false, // Use migrations instead
  logging: process.env.NODE_ENV === 'development',
  entities: [Event, Ticket],
  migrations: ['src/migrations/*.ts'],
  migrationsRun: false,
  // Optimized for concurrent access
  extra: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
  },
});
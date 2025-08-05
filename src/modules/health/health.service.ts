import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get basic application health status
   */
  async getHealthStatus() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Check database connectivity and basic stats
   */
  async getDatabaseHealth() {
    try {
      // Test database connection
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Get basic database info
      const [eventCount] = await this.dataSource.query('SELECT COUNT(*) as count FROM events');
      const [ticketCount] = await this.dataSource.query('SELECT COUNT(*) as count FROM tickets');

      return {
        status: 'connected',
        responseTime: `${responseTime}ms`,
        database: {
          type: this.dataSource.options.type,
          host: (this.dataSource.options as any).host || 'N/A',
          database: (this.dataSource.options as any).database || 'N/A',
        },
        stats: {
          total_events: parseInt(eventCount.count),
          total_tickets: parseInt(ticketCount.count),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Database health check failed:', errorMessage);
      return {
        status: 'disconnected',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
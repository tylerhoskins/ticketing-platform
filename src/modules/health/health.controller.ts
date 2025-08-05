import { Controller, Get, Logger } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check endpoint
   * GET /api/health
   */
  @Get()
  async getHealth() {
    this.logger.log('Health check requested');
    return this.healthService.getHealthStatus();
  }

  /**
   * Database health check
   * GET /api/health/database
   */
  @Get('database')
  async getDatabaseHealth() {
    this.logger.log('Database health check requested');
    return this.healthService.getDatabaseHealth();
  }
}
import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Health check and database connectivity verification' })
  @ApiResponse({ status: 200, description: 'Application and database are healthy' })
  @ApiResponse({ status: 503, description: 'Database connection failed' })
  async checkHealth() {
    let dbStatus = 'disconnected';
    let dbHealthy = false;

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
        dbHealthy = true;
      }
    } catch {
      dbStatus = 'error';
      dbHealthy = false;
    }

    const responsePayload = {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'forever-it-institute-management-api',
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        driver: 'postgres',
      },
    };

    if (!dbHealthy) {
      throw new HttpException(responsePayload, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return responsePayload;
  }
}

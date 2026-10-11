import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';

export interface CreateAuditLogParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  performedBy: string;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: CreateAuditLogParams): Promise<AuditLog> {
    try {
      const logEntry = this.auditLogRepository.create({
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        performedBy: params.performedBy,
        details: params.details ?? null,
        ipAddress: params.ipAddress ?? null,
      });

      return await this.auditLogRepository.save(logEntry);
    } catch (err) {
      this.logger.error(`Failed to record audit log for action "${params.action}":`, err);
      // Don't fail the primary transaction if logging fails, unless critical
      return null as any;
    }
  }
}

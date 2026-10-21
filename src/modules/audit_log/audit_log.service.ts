import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AuditLog } from './entities/audit_log.entity';
import { User } from '../user/entities/user.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Op } from 'sequelize';

const LOG_RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuditLogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog) private auditLogRepository: typeof AuditLog,
  ) { }

  onApplicationBootstrap() {
    this.deleteOldLogs();
    setInterval(() => this.deleteOldLogs(), CLEANUP_INTERVAL_MS);
  }

  private async deleteOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);

      const deleted = await this.auditLogRepository.destroy({
        where: {
          created_at: { [Op.lt]: cutoffDate },
        },
      });

      if (deleted > 0) {
        this.logger.log(`[AuditLog] ${deleted} eski log silindi (${LOG_RETENTION_DAYS} günden eski)`);
      }
    } catch (err) {
      this.logger.error('[AuditLog] Eski log silinirken hata:', err?.message);
    }
  }

  async createLog(data: {
    user_guid: string | null;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    endpoint: string;
    module: string | null;
    request_body: Record<string, any> | null;
    status_code: number | null;
    is_success: boolean;
    ip_address: string | null;
  }): Promise<void> {
    try {
      await this.auditLogRepository.create(data as any);
    } catch (err) {
      console.error('[AuditLog] Log kaydedilemedi:', err?.message);
    }
  }

  async getLogs(
    page: number = 1,
    limit: number = 20,
    filters?: {
      user_guid?: string;
      action?: string;
      module?: string;
      from_date?: string;
      to_date?: string;
    },
  ) {
    const currentPage = Math.max(1, Number(page));
    const currentLimit = Math.max(1, Math.min(100, Number(limit)));
    const offset = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (filters?.user_guid) where.user_guid = filters.user_guid;
    if (filters?.action) where.action = filters.action;
    if (filters?.module) where.module = { [Op.iLike]: `%${filters.module}%` };

    if (filters?.from_date || filters?.to_date) {
      where.created_at = {};
      if (filters?.from_date) where.created_at[Op.gte] = new Date(filters.from_date);
      if (filters?.to_date) where.created_at[Op.lte] = new Date(filters.to_date);
    }

    const { count, rows } = await this.auditLogRepository.findAndCountAll({
      where,
      limit: currentLimit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['guid', 'phone_number', 'role'],
          required: false,
          include: [
            {
              model: Employee,
              attributes: ['guid', 'fullName'],
              required: false,
            },
          ],
        },
      ],
    });

    return {
      status: 200,
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / currentLimit),
        currentPage,
      },
    };
  }
}

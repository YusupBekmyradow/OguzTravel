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
        this.logger.log(`[AuditLog] ${deleted} sany köne log pozuldy (${LOG_RETENTION_DAYS} günden köne)`);
      }
    } catch (err) {
      this.logger.error('[AuditLog] Köne loglar pozulýarka säwlik ýüze çykdy:', (err as any)?.message);
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
      this.logger.error('[AuditLog] Log ýazgysy ýazylanda säwlik ýüze çykdy:', (err as any)?.message);
    }
  }

  private parseDate(val?: string, isEnd = false): Date | null {
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (!trimmed) return null;

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      const [, y, m, d] = dateOnlyMatch;
      return isEnd
        ? new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999)
        : new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
    }

    const minuteMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(trimmed);
    if (minuteMatch) {
      const [, y, m, d, hh, mm] = minuteMatch;
      return isEnd
        ? new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 59, 999)
        : new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
    }

    const secondMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
    if (secondMatch) {
      const [, y, m, d, hh, mm, ss] = secondMatch;
      return isEnd
        ? new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss), 999)
        : new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss), 0);
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return null;

    if (isEnd && !trimmed.includes('.') && parsed.getMilliseconds() === 0) {
      parsed.setMilliseconds(999);
    }
    return parsed;
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

    const userGuid = filters?.user_guid?.trim();
    if (userGuid) where.user_guid = userGuid;

    const action = filters?.action?.trim();
    if (action) where.action = action;

    const module = filters?.module?.trim();
    if (module) where.module = { [Op.iLike]: `%${module}%` };

    const fromDate = this.parseDate(filters?.from_date, false);
    const toDate = this.parseDate(filters?.to_date, true);

    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at[Op.gte] = fromDate;
      if (toDate) where.created_at[Op.lte] = toDate;
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

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from '../../modules/audit_log/audit_log.service';

// Audit log kaydedilecek HTTP metodları
const AUDIT_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

// Hassas alanlar — request body'den temizlenecek (şifre vs log'a yazılmasın)
const SENSITIVE_FIELDS = ['password', 'new_password', 'old_password', 'refresh_token', 'token'];

/**
 * Endpoint URL'inden modül adını çıkarır
 * Örnek: /api/v1/tour/add-tour → "tour"
 *        /api/v1/visa/create  → "visa"
 */
function extractModule(url: string): string | null {
  // /api/v1/ prefix'ini kaldır, ilk segment modül adı
  const match = url.replace(/^\/api\/v1\//, '').split('/')[0];
  return match || null;
}

/**
 * HTTP metoduna göre action belirler
 */
function resolveAction(method: string): 'CREATE' | 'UPDATE' | 'DELETE' | null {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PATCH':
    case 'PUT':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return null;
  }
}

/**
 * Body'den hassas alanları temizler (password vs log'a yazılmasın)
 */
function sanitizeBody(body: any): Record<string, any> | null {
  if (!body || typeof body !== 'object') return null;
  const cleaned = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in cleaned) {
      cleaned[field] = '***';
    }
  }
  return cleaned;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, user, ip, headers } = req;

    // Sadece audit metodlarını yakala
    if (!AUDIT_METHODS.includes(method.toUpperCase())) {
      return next.handle();
    }

    const action = resolveAction(method);
    if (!action) return next.handle();

    // Kullanıcı bilgisi JWT guard'dan gelir (req.user)
    const user_guid: string | null = user?.guid ?? null;

    // IP adresi (proxy arkasındaysa x-forwarded-for)
    const ip_address: string | null =
      (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || ip || null;

    const module = extractModule(url);
    const sanitizedBody = sanitizeBody(body);

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          // Response geldi — status code'u al
          const res = context.switchToHttp().getResponse();
          const status_code = res.statusCode;
          const is_success = status_code < 400;

          // Log'u async yaz — await etme, ana akışı bloklamasın
          this.auditLogService.createLog({
            user_guid,
            action,
            endpoint: url,
            module,
            request_body: sanitizedBody,
            status_code,
            is_success,
            ip_address,
          });
        },
        error: (err) => {
          // Hata durumunda da log at
          this.auditLogService.createLog({
            user_guid,
            action,
            endpoint: url,
            module,
            request_body: sanitizedBody,
            status_code: err?.status || 500,
            is_success: false,
            ip_address,
          });
        },
      }),
    );
  }
}

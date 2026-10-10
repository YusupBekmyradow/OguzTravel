import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    Logger,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Response');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        return next.handle().pipe(
            map((data) => {
                const i18n = I18nContext.current(context);

                if (data?.status && (data?.message || data?.errorMessage)) {
                    response.statusCode = data.status;

                    if (i18n && typeof data.message === 'string' && data.message.includes('.')) {
                        const translated = i18n.t(data.message);
                        if (translated && translated !== data.message) {
                            data.message = translated;
                        }
                    }

                    if (data.status >= 400) {
                        const err = data.errorMessage?.stack || data.errorMessage || data.message;
                        this.logger.error(`[${request.method}] ${request.url} → ${data.status} [${data.message}]`);
                        if (err && err !== data.message) {
                            console.error(`\x1b[31m[Error Details]:\x1b[0m`, err);
                        }
                    }

                    return data;
                }

                return {
                    status: response.statusCode,
                    data: data,
                    message: null,
                    errorMessage: null,
                };
            }),
        );
    }
}

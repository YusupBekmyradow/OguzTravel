import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    Logger,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Response');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        return next.handle().pipe(
            map((data) => {
                if (data?.status && (data?.message || data?.errorMessage)) {
                    response.statusCode = data.status;

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

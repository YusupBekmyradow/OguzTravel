import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const { method, url } = req;
        const now = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const res = context.switchToHttp().getResponse();
                    const statusCode = res.statusCode;
                    const delay = Date.now() - now;
                    if (statusCode >= 400) {
                        this.logger.error(`${method} ${url} → ${statusCode} [${delay}ms]`);
                    } else {
                        this.logger.log(`${method} ${url} → ${statusCode} [${delay}ms]`);
                    }
                },
                error: (err) => {
                    const delay = Date.now() - now;
                    this.logger.error(`${method} ${url} → ERROR [${delay}ms]`);
                    console.error(`\x1b[31m[Unhandled Exception]:\x1b[0m`, err?.stack || err);
                },
            }),
        );
    }
}

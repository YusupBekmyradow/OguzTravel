import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();

        return next.handle().pipe(
            map((data) => {
                if (data?.status && (data?.message || data?.errorMessage)) {
                    response.statusCode = data.status;
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

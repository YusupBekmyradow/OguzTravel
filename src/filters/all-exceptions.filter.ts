import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { logger } from '../utils/logger';
import { I18nValidationException } from 'nestjs-i18n';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    if (exception instanceof I18nValidationException) {
      const errors = exception.errors;
      const messages = errors?.map(e => Object.values(e.constraints || {}).join(', ')) || [];
      return response.status(HttpStatus.BAD_REQUEST).json({
        status: HttpStatus.BAD_REQUEST,
        message: messages.join('; ') || 'Validation failed',
        data: null,
      });
    }
    if (exception instanceof HttpException) {
      status = exception.getStatus();
    } else if (exception && typeof exception === 'object' && 'status' in exception) {
      status = Number(exception['status']) || HttpStatus.INTERNAL_SERVER_ERROR;
    }
    let errorMessage: any;
    if (exception instanceof HttpException) {
      errorMessage = exception.getResponse();
    } else if (exception instanceof Error) {
      errorMessage = exception.stack || exception.message;
    } else if (exception && typeof exception === 'object' && 'errorMessage' in exception) {
      errorMessage = exception['errorMessage'];
    } else {
      errorMessage = exception;
    }
    if (status >= HttpStatus.BAD_REQUEST) {
      logger.error(`Server Error [${request.method}] ${request.url} - Status: ${status}`, {
        status,
        path: request.url,
        method: request.method,
        error: errorMessage,
      });
    }

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
          status: status,
          message: (exception as any)?.message || 'Internal server error occurred',
          errorMessage: (exception as any)?.errorMessage || (exception instanceof Error ? exception.message : exception),
        };

    response.status(status).json(responseBody);
  }
}
// import {
//   ExceptionFilter,
//   Catch,
//   ArgumentsHost,
//   HttpException,
//   HttpStatus,
// } from '@nestjs/common';
// import { logger } from '../logger';

// @Catch()
// export class AllExceptionsFilter implements ExceptionFilter {
//   catch(exception: unknown, host: ArgumentsHost) {
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse();
//     const request = ctx.getRequest();

//     const status =
//       exception instanceof HttpException
//         ? exception.getStatus()
//         : HttpStatus.INTERNAL_SERVER_ERROR;

//     const message =
//       exception instanceof HttpException
//         ? exception.getResponse()
//         : (exception as any).message || 'Internal server error occurred';

//     if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
//       logger.error(`Server Error [${request.method}] ${request.url}`, {
//         status,
//         error: exception instanceof Error ? exception.stack : exception,
//       });
//     }

//     response.status(status).json({
//       statusCode: status,
//       timestamp: new Date().toISOString(),
//       path: request.url,
//       message: message,
//     });
//   }
// }
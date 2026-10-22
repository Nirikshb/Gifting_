import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message = this.formatMessage(exceptionResponse);

      response.status(statusCode).json({
        success: false,
        message,
        statusCode,
      });
      return;
    }

    this.logger.error(exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }

  private formatMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
      return 'An error occurred';
    }

    const { message } = exceptionResponse as { message?: unknown };

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message
        .map((item) => this.formatValidationItem(item))
        .join('; ');
    }

    return 'An error occurred';
  }

  private formatValidationItem(item: unknown): string {
    if (typeof item === 'string') {
      return item;
    }

    if (typeof item === 'object' && item !== null) {
      const candidate = item as {
        constraints?: Record<string, string>;
        property?: string;
      };

      if (candidate.constraints) {
        return Object.values(candidate.constraints).join(', ');
      }
    }

    return String(item);
  }
}

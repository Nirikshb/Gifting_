import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

function isSuccessEnvelope(
  value: unknown,
): value is { success: true; data: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as { success: unknown }).success === true
  );
}

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as PaginatedResult<T>;

  return (
    Array.isArray(candidate.items) &&
    typeof candidate.total === 'number' &&
    typeof candidate.page === 'number' &&
    typeof candidate.limit === 'number'
  );
}

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (isSuccessEnvelope(data)) {
          return data;
        }

        if (isPaginatedResult(data)) {
          const { items, total, page, limit } = data;
          const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

          return {
            success: true,
            data: items,
            pagination: {
              total,
              page,
              limit,
              totalPages,
            },
          };
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { Customer } from '../../customers/entities/customer.entity';
import type { RequestWithCustomer } from '../request-with-customer';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Customer => {
    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithCustomer>();

    return request.customer!;
  },
);

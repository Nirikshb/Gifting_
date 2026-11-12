import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_UNAUTHORIZED_MESSAGE } from '../session.constants';
import { SessionService } from '../session.service';
import type { RequestWithCustomer } from '../types/request-with-customer';

export const ADMIN_FORBIDDEN_MESSAGE = 'Admin access required';

/**
 * Admin authorization layered on the existing session cookie. There is no
 * separate admin login: the customer account carries a `role` of `admin`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithCustomer>();

    const sessionToken = this.sessionService.readSessionTokenFromCookie(
      request.cookies,
    );
    const customer =
      await this.sessionService.findCustomerBySessionToken(sessionToken);

    if (!customer) {
      throw new UnauthorizedException(SESSION_UNAUTHORIZED_MESSAGE);
    }

    if (customer.role !== 'admin') {
      throw new ForbiddenException(ADMIN_FORBIDDEN_MESSAGE);
    }

    request.customer = customer;
    return true;
  }
}

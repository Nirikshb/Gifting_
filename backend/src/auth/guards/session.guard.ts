import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RequestWithCustomer } from '../request-with-customer';
import { SESSION_UNAUTHORIZED_MESSAGE } from '../session.constants';
import { SessionService } from '../session.service';

@Injectable()
export class SessionGuard implements CanActivate {
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

    request.customer = customer;
    return true;
  }
}

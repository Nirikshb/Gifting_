import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { QueryFailedError, Repository } from 'typeorm';
import { CartsService } from '../carts/carts.service';
import type { CartCookieAction } from '../carts/types/cart-cookie-action';
import {
  getGoogleClientId,
  GOOGLE_SIGN_IN_NOT_CONFIGURED_MESSAGE,
  isConfiguredAdminEmail,
  isGoogleSignInConfigured,
} from '../config/auth-configuration';
import {
  Customer,
  type CustomerRole,
} from '../customers/entities/customer.entity';

export type CustomerProfile = {
  id: number;
  email: string;
  displayName: string;
  role: CustomerRole;
};

export type GoogleSignInResult = {
  profile: CustomerProfile;
  sessionToken: string;
  guestCartCookie: CartCookieAction;
};

const GOOGLE_SUB_UNIQUE_CONSTRAINT = 'customers_google_sub_unique';
const GENERIC_SIGN_IN_FAILURE_MESSAGE = 'Sign-in failed';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cartsService: CartsService,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async signInWithGoogle(
    credential: string,
    request: Request,
  ): Promise<GoogleSignInResult> {
    if (!isGoogleSignInConfigured(this.configService)) {
      throw new ServiceUnavailableException(
        GOOGLE_SIGN_IN_NOT_CONFIGURED_MESSAGE,
      );
    }

    const googleClientId = getGoogleClientId(this.configService)!;
    const payload = await this.verifyGoogleCredential(credential, googleClientId);

    const customer = await this.findOrCreateCustomer({
      googleSub: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
    });

    const { sessionToken, cookie } =
      await this.cartsService.createSessionAndMergeGuestCart(
        customer.id,
        request,
      );

    return {
      profile: this.toProfile(customer),
      sessionToken,
      guestCartCookie: cookie,
    };
  }

  toProfile(customer: Customer): CustomerProfile {
    return {
      id: customer.id,
      email: customer.email,
      displayName: customer.displayName,
      role: customer.role,
    };
  }

  private async verifyGoogleCredential(
    credential: string,
    googleClientId: string,
  ): Promise<{ sub: string; email: string; displayName: string }> {
    const client = new OAuth2Client(googleClientId);

    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub) {
        throw new UnauthorizedException(GENERIC_SIGN_IN_FAILURE_MESSAGE);
      }

      const email = payload.email?.trim();
      if (!email) {
        throw new UnauthorizedException(GENERIC_SIGN_IN_FAILURE_MESSAGE);
      }

      const displayName =
        payload.name?.trim() || email.split('@')[0] || 'Customer';

      return {
        sub: payload.sub,
        email,
        displayName,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn('Google ID token verification failed');
      throw new UnauthorizedException(GENERIC_SIGN_IN_FAILURE_MESSAGE);
    }
  }

  private async findOrCreateCustomer(input: {
    googleSub: string;
    email: string;
    displayName: string;
  }): Promise<Customer> {
    const existing = await this.customerRepository.findOne({
      where: { googleSub: input.googleSub },
    });

    if (existing) {
      existing.email = input.email;
      existing.displayName = input.displayName;
      if (
        existing.role !== 'admin' &&
        isConfiguredAdminEmail(this.configService, input.email)
      ) {
        existing.role = 'admin';
      }
      return this.customerRepository.save(existing);
    }

    try {
      const created = this.customerRepository.create({
        googleSub: input.googleSub,
        email: input.email,
        displayName: input.displayName,
        role: isConfiguredAdminEmail(this.configService, input.email)
          ? 'admin'
          : 'customer',
      });
      return await this.customerRepository.save(created);
    } catch (error) {
      if (!this.isGoogleSubUniqueViolation(error)) {
        throw error;
      }

      const raced = await this.customerRepository.findOne({
        where: { googleSub: input.googleSub },
      });

      if (!raced) {
        throw error;
      }

      raced.email = input.email;
      raced.displayName = input.displayName;
      if (
        raced.role !== 'admin' &&
        isConfiguredAdminEmail(this.configService, input.email)
      ) {
        raced.role = 'admin';
      }
      return this.customerRepository.save(raced);
    }
  }

  private isGoogleSubUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driverError?.code === '23505' &&
      driverError.constraint === GOOGLE_SUB_UNIQUE_CONSTRAINT
    );
  }
}

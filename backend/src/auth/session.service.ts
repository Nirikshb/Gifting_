import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import type { CookieOptions } from 'express';
import { Repository } from 'typeorm';
import { getSessionTtlDays, getSessionCookieSameSite } from '../config/auth-configuration';
import { CustomerSession } from '../customers/entities/customer-session.entity';
import { Customer } from '../customers/entities/customer.entity';
import { SESSION_COOKIE_NAME } from './session.constants';

@Injectable()
export class SessionService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(CustomerSession)
    private readonly customerSessionRepository: Repository<CustomerSession>,
  ) {}

  hashSessionToken(token: string): string {
    const secret = this.configService.get<string>('SESSION_SECRET')?.trim() ?? '';
    return createHash('sha256').update(`${secret}:${token}`).digest('hex');
  }

  getSessionMaxAgeSeconds(): number {
    return getSessionTtlDays(this.configService) * 24 * 60 * 60;
  }

  getSessionCookieOptions(): CookieOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      path: '/',
      maxAge: this.getSessionMaxAgeSeconds() * 1000,
      secure: isProduction,
      sameSite: getSessionCookieSameSite(this.configService),
    };
  }

  getSessionClearCookieOptions(): CookieOptions {
    const { maxAge: _maxAge, ...options } = this.getSessionCookieOptions();
    return options;
  }

  readSessionTokenFromCookie(
    cookies: Record<string, string> | undefined,
  ): string | undefined {
    const value = cookies?.[SESSION_COOKIE_NAME];
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  async createSessionForCustomer(customerId: number): Promise<string> {
    const ttlDays = getSessionTtlDays(this.configService);
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + ttlDays * 24 * 60 * 60 * 1000,
    );

    const sessionToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashSessionToken(sessionToken);

    const session = this.customerSessionRepository.create({
      customerId,
      tokenHash,
      expiresAt,
    });

    await this.customerSessionRepository.save(session);
    return sessionToken;
  }

  async findCustomerBySessionToken(
    sessionToken: string | undefined,
  ): Promise<Customer | null> {
    if (!sessionToken) {
      return null;
    }

    const tokenHash = this.hashSessionToken(sessionToken);
    const session = await this.customerSessionRepository.findOne({
      where: { tokenHash },
      relations: { customer: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return session.customer;
  }

  async invalidateSessionToken(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }

    const tokenHash = this.hashSessionToken(sessionToken);
    await this.customerSessionRepository.delete({ tokenHash });
  }
}

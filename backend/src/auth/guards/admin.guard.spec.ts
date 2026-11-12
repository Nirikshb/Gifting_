import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../customers/entities/customer.entity';
import type { RequestWithCustomer } from '../types/request-with-customer';
import { AdminGuard } from './admin.guard';

function makeContext(request: Request & RequestWithCustomer) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function makeCustomer(role: Customer['role']): Customer {
  return {
    id: 7,
    googleSub: 'sub',
    email: 'person@example.com',
    displayName: 'Person',
    role,
    sessions: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Customer;
}

function makeSessionService(customer: Customer | null) {
  return {
    readSessionTokenFromCookie: vi.fn(() => 'session-token'),
    findCustomerBySessionToken: vi.fn().mockResolvedValue(customer),
  };
}

describe('AdminGuard', () => {
  it('rejects requests without a session', async () => {
    const sessions = makeSessionService(null);
    const guard = new AdminGuard(sessions as never);
    const request = { cookies: {} } as Request & RequestWithCustomer;

    await expect(guard.canActivate(makeContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.customer).toBeUndefined();
  });

  it('rejects signed-in customers without the admin role', async () => {
    const sessions = makeSessionService(makeCustomer('customer'));
    const guard = new AdminGuard(sessions as never);
    const request = { cookies: {} } as Request & RequestWithCustomer;

    await expect(guard.canActivate(makeContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.customer).toBeUndefined();
  });

  it('allows an admin and attaches the session customer', async () => {
    const admin = makeCustomer('admin');
    const sessions = makeSessionService(admin);
    const guard = new AdminGuard(sessions as never);
    const request = { cookies: {} } as Request & RequestWithCustomer;

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.customer).toBe(admin);
  });
});

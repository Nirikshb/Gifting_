import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Injection token for the payment provider adapter.
 *
 * No provider is configured in this task. The placeholder adapter fails closed
 * so no code path can accidentally treat an order as paid.
 */
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export type VerifiedPaymentEvent = {
  /**
   * Only a provider adapter that has verified the provider signature may set
   * this to true. Plain request payloads must never be passed here.
   */
  verified: true;
  provider: string;
  eventId: string;
  orderReference: string;
  providerReference: string;
  amount: string;
  currency: 'INR';
  paidAt: Date;
};

export interface PaymentGateway {
  readonly provider: string;
  isConfigured(): boolean;
  /**
   * Verifies a raw provider event and normalises it. Implementations must throw
   * for bad signatures, unsupported events or malformed payloads.
   */
  verifyEvent(payload: unknown): Promise<VerifiedPaymentEvent>;
}

export class UnconfiguredPaymentGateway implements PaymentGateway {
  readonly provider = 'unconfigured';

  isConfigured(): boolean {
    return false;
  }

  async verifyEvent(_payload: unknown): Promise<VerifiedPaymentEvent> {
    throw new ServiceUnavailableException('Payment provider is not configured.');
  }
}

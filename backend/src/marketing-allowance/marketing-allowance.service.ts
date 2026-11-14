import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import {
  MARKETING_ALLOWANCE_CATEGORIES,
  MarketingAllowanceCategory,
  MarketingAllowanceLedger,
} from './entities/marketing-allowance-ledger.entity';

/**
 * Manages the one-time marketing allowance ledger.
 *
 * Reservation is atomic: the database unique constraint on
 * (normalized_email, marketing_category) guarantees that at most one row
 * exists per category per address, so concurrent reservation requests cannot
 * both succeed. A previous `failed` reservation can be reused atomically,
 * while `reserved` and `sent` allowances reject re-reservation.
 *
 * Provider acceptance consumes the allowance; it does not confirm inbox
 * delivery.
 */
@Injectable()
export class MarketingAllowanceService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Atomically reserve the one-time allowance for an email + category.
   *
   * - Normalizes the email consistently (trim + lowercase).
   * - Reuses a previous `failed` reservation atomically.
   * - Rejects an existing `reserved` or `sent` allowance.
   * - Prevents concurrent reservations via the unique constraint.
   * - Updates the existing failed row rather than creating duplicates.
   *
   * Returns `{ success: true, ledger }` when the reservation succeeded, or
   * `{ success: false, reason }` when it could not be granted.
   */
  async reserveAllowance(
    email: string,
    category: MarketingAllowanceCategory,
    customerId?: number | null,
  ): Promise<
    | { success: true; ledger: MarketingAllowanceLedger }
    | { success: false; reason: 'already-reserved' | 'already-consumed' }
  > {
    const normalizedEmail = this.normalizeEmail(email);
    this.validateCategory(category);

    return await this.dataSource.transaction(async (manager) => {
      // 1. Reuse a previously failed allowance atomically.
      const reused = await manager
        .createQueryBuilder()
        .update(MarketingAllowanceLedger)
        .set({ status: 'reserved', updatedAt: () => 'CURRENT_TIMESTAMP' })
        .where(
          'normalized_email = :email AND marketing_category = :category AND status = :failed',
          {
            email: normalizedEmail,
            category,
            failed: 'failed',
          },
        )
        .returning(['*'])
        .execute();

      if ((reused.affected ?? 0) > 0) {
        return {
          success: true,
          ledger: (reused.raw as MarketingAllowanceLedger[])[0],
        };
      }

      // 2. Reject if a reserved or sent allowance already exists.
      const existing = await manager
        .getRepository(MarketingAllowanceLedger)
        .findOne({
          where: { normalizedEmail, marketingCategory: category },
        });
      if (existing) {
        return {
          success: false,
          reason:
            existing.status === 'sent'
              ? 'already-consumed'
              : 'already-reserved',
        };
      }

      // 3. Insert a fresh reserved row. The unique constraint guards against
      //    concurrent reservations; a unique violation means another request
      //    won the race.
      const ledger = manager.getRepository(MarketingAllowanceLedger).create({
        normalizedEmail,
        marketingCategory: category,
        customerId: customerId ?? null,
        campaignId: null,
        outboxId: null,
        status: 'reserved',
      });

      try {
        const saved = await manager
          .getRepository(MarketingAllowanceLedger)
          .save(ledger);
        return { success: true, ledger: saved };
      } catch (error) {
        if (!this.isUniqueViolation(error)) {
          throw error;
        }

        // Lost the race: re-read and reject since the winner is reserved/sent.
        const winner = await manager
          .getRepository(MarketingAllowanceLedger)
          .findOne({
            where: { normalizedEmail, marketingCategory: category },
          });
        if (!winner) {
          throw error;
        }
        return {
          success: false,
          reason:
            winner.status === 'sent' ? 'already-consumed' : 'already-reserved',
        };
      }
    });
  }

  /**
   * Transition a reserved allowance to sent.
   *
   * Only a `reserved` allowance can become `sent`. Stores the provider message
   * ID and the successful provider acceptance timestamp. Rejects invalid
   * transitions.
   */
  async markAllowanceSent(
    ledgerId: number,
    providerMessageId?: string | null,
  ): Promise<MarketingAllowanceLedger> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(MarketingAllowanceLedger)
      .set({
        status: 'sent',
        providerMessageId: providerMessageId ?? null,
        sentAt: new Date(),
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND status = :status', {
        id: ledgerId,
        status: 'reserved',
      })
      .returning(['*'])
      .execute();

    if ((result.affected ?? 0) === 0) {
      const existing = await this.findOne(ledgerId);
      if (!existing) {
        throw new NotFoundException(
          `Marketing allowance ledger ${ledgerId} not found.`,
        );
      }
      throw new BadRequestException(
        `Cannot mark ledger ${ledgerId} as sent; current status is ${existing.status}.`,
      );
    }

    return (result.raw as MarketingAllowanceLedger[])[0];
  }

  /**
   * Transition a reserved allowance to failed when the failure is permanent.
   *
   * Preserves the record for auditability. Retryable failures must NOT call
   * this method: they keep the reservation so the existing outbox retry can
   * still consume the allowance.
   */
  async markAllowanceFailed(
    ledgerId: number,
  ): Promise<MarketingAllowanceLedger> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(MarketingAllowanceLedger)
      .set({ status: 'failed', updatedAt: () => 'CURRENT_TIMESTAMP' })
      .where('id = :id AND status = :status', {
        id: ledgerId,
        status: 'reserved',
      })
      .returning(['*'])
      .execute();

    if ((result.affected ?? 0) === 0) {
      const existing = await this.findOne(ledgerId);
      if (!existing) {
        throw new NotFoundException(
          `Marketing allowance ledger ${ledgerId} not found.`,
        );
      }
      throw new BadRequestException(
        `Cannot mark ledger ${ledgerId} as failed; current status is ${existing.status}.`,
      );
    }

    return (result.raw as MarketingAllowanceLedger[])[0];
  }

  /** Returns the allowance ledger row by id, or null when it does not exist. */
  async findOne(ledgerId: number): Promise<MarketingAllowanceLedger | null> {
    return this.dataSource.getRepository(MarketingAllowanceLedger).findOne({
      where: { id: ledgerId },
    });
  }

  /** Returns the allowance ledger row by email + category, or null. */
  async findByEmailAndCategory(
    email: string,
    category: MarketingAllowanceCategory,
  ): Promise<MarketingAllowanceLedger | null> {
    return this.dataSource.getRepository(MarketingAllowanceLedger).findOne({
      where: {
        normalizedEmail: this.normalizeEmail(email),
        marketingCategory: category,
      },
    });
  }

  /** Returns the allowance ledger row by outbox ID, or null. */
  async findByOutboxId(
    outboxId: number,
  ): Promise<MarketingAllowanceLedger | null> {
    return this.dataSource.getRepository(MarketingAllowanceLedger).findOne({
      where: { outboxId },
    });
  }

  /** Whether the allowance for an email + category is currently consumable (reserved). */
  async isReserved(
    email: string,
    category: MarketingAllowanceCategory,
  ): Promise<boolean> {
    const row = await this.findByEmailAndCategory(email, category);
    return row?.status === 'reserved';
  }

  /** Whether the allowance for an email + category has been consumed (sent). */
  async isConsumed(
    email: string,
    category: MarketingAllowanceCategory,
  ): Promise<boolean> {
    const row = await this.findByEmailAndCategory(email, category);
    return row?.status === 'sent';
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private validateCategory(category: MarketingAllowanceCategory): void {
    if (!MARKETING_ALLOWANCE_CATEGORIES.includes(category)) {
      throw new BadRequestException(
        `Unknown marketing category "${category}".`,
      );
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };
    return driverError?.code === '23505';
  }
}

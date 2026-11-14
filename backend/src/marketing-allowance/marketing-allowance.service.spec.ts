import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { vi } from 'vitest';
import {
  MarketingAllowanceLedger,
  MarketingAllowanceCategory,
} from './entities/marketing-allowance-ledger.entity';
import { MarketingAllowanceService } from './marketing-allowance.service';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function resolveValue(value: unknown): unknown {
  if (typeof value === 'function') {
    return (value as () => unknown)();
  }
  return value;
}

function columnToProperty(column: string): string {
  return column.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
}

class FakeQueryBuilder {
  private _set: Record<string, unknown> = {};
  private _where = '';
  private _params: Record<string, unknown> = {};
  private _returning: string[] = [];

  constructor(private readonly rows: MarketingAllowanceLedger[]) {}

  update() {
    return this;
  }

  set(values: Record<string, unknown>) {
    this._set = values;
    return this;
  }

  where(clause: string, params: Record<string, unknown>) {
    this._where = clause;
    this._params = params;
    return this;
  }

  returning(cols: string[]) {
    this._returning = cols;
    return this;
  }

  execute(): {
    affected: number;
    raw: MarketingAllowanceLedger[];
  } {
    const mappings: Array<[string, string]> = [];
    const regex = /(\w+)\s*=\s*:(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(this._where)) !== null) {
      mappings.push([match[1], match[2]]);
    }

    const affectedRows: MarketingAllowanceLedger[] = [];
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      let ok = true;
      for (const [col, param] of mappings) {
        const property = columnToProperty(col);
        if (
          (row as unknown as Record<string, unknown>)[property] !==
          this._params[param]
        ) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const updated: MarketingAllowanceLedger = {
        ...row,
      };
      for (const [key, value] of Object.entries(this._set)) {
        (updated as unknown as Record<string, unknown>)[key] =
          resolveValue(value);
      }
      this.rows[i] = updated;
      affectedRows.push(updated);
    }

    return { affected: affectedRows.length, raw: affectedRows };
  }
}

class FakeRepository {
  rows: MarketingAllowanceLedger[] = [];
  nextId = 1;

  findOne = vi
    .fn()
    .mockImplementation((opts: { where: Record<string, unknown> }) => {
      const where = opts?.where ?? {};
      for (const row of this.rows) {
        let ok = true;
        for (const [key, value] of Object.entries(where)) {
          if ((row as unknown as Record<string, unknown>)[key] !== value) {
            ok = false;
            break;
          }
        }
        if (ok) {
          return Promise.resolve(row);
        }
      }
      return Promise.resolve(null);
    });

  create = vi.fn().mockImplementation((input: unknown) => input);

  save = vi.fn().mockImplementation((input: MarketingAllowanceLedger) => {
    if (!input.id) {
      // Enforce the unique constraint on (normalized_email, marketing_category).
      const dup = this.rows.find(
        (r) =>
          r.normalizedEmail === input.normalizedEmail &&
          r.marketingCategory === input.marketingCategory,
      );
      if (dup) {
        const err = new QueryFailedError(
          'insert into marketing_allowance_ledger (...) values (...)',
          [],
          new Error('duplicate key'),
        );
        (
          err as unknown as {
            driverError?: { code?: string; constraint?: string };
          }
        ).driverError = {
          code: '23505',
          constraint: 'marketing_allowance_ledger_email_category_unique',
        };
        throw err;
      }
      const row: MarketingAllowanceLedger = { ...input, id: this.nextId++ };
      this.rows.push(row);
      return row;
    }

    const idx = this.rows.findIndex((r) => r.id === input.id);
    if (idx >= 0) {
      this.rows[idx] = { ...this.rows[idx], ...input };
      return this.rows[idx];
    }
    return input;
  });

  createQueryBuilder() {
    return new FakeQueryBuilder(this.rows);
  }
}

class FakeDataSource {
  repo = new FakeRepository();

  async transaction<T>(run: (manager: FakeManager) => Promise<T>): Promise<T> {
    const manager = new FakeManager(this.repo);
    return run(manager);
  }

  getRepository() {
    return this.repo;
  }

  createQueryBuilder() {
    return new FakeQueryBuilder(this.repo.rows);
  }
}

class FakeManager {
  constructor(private readonly repo: FakeRepository) {}

  getRepository() {
    return this.repo;
  }

  createQueryBuilder() {
    return new FakeQueryBuilder(this.repo.rows);
  }
}

function makeService(dataSource?: DataSource) {
  const ds = dataSource ?? (new FakeDataSource() as unknown as DataSource);
  const service = new MarketingAllowanceService(ds);
  return { service, dataSource: ds };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MarketingAllowanceService', () => {
  describe('reserveAllowance', () => {
    it('first promotional reservation succeeds', async () => {
      const { service, dataSource } = makeService();

      const result = await service.reserveAllowance(
        'Alice@Example.com',
        'promotional',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ledger.normalizedEmail).toBe('alice@example.com');
        expect(result.ledger.marketingCategory).toBe('promotional');
        expect(result.ledger.status).toBe('reserved');
        expect(result.ledger.customerId).toBeNull();
      }

      const repo = (dataSource as unknown as FakeDataSource).repo;
      expect(repo.rows).toHaveLength(1);
    });

    it('stores customer id when provided', async () => {
      const { service } = makeService();

      const result = await service.reserveAllowance(
        'bob@example.com',
        'promotional',
        42,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ledger.customerId).toBe(42);
      }
    });

    it('works with null customer id for newsletter subscribers', async () => {
      const { service } = makeService();

      const result = await service.reserveAllowance(
        'guest@example.com',
        'promotional',
        null,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ledger.customerId).toBeNull();
      }
    });

    it('duplicate promotional reservation fails', async () => {
      const { service } = makeService();

      await service.reserveAllowance('alice@example.com', 'promotional');
      const result = await service.reserveAllowance(
        'ALICE@example.com ',
        'promotional',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('already-reserved');
      }
    });

    it('abandoned-cart reservation is independent of promotional', async () => {
      const { service } = makeService();

      await service.reserveAllowance('alice@example.com', 'promotional');
      const result = await service.reserveAllowance(
        'alice@example.com',
        'abandoned_cart',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ledger.marketingCategory).toBe('abandoned_cart');
      }
    });

    it('failed promotional allowance can be reserved again', async () => {
      const { service, dataSource } = makeService();

      const first = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(first.success).toBe(true);
      if (!first.success) return;

      await service.markAllowanceFailed(first.ledger.id);

      const second = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(second.success).toBe(true);
      if (second.success) {
        expect(second.ledger.status).toBe('reserved');
      }

      const repo = (dataSource as unknown as FakeDataSource).repo;
      expect(repo.rows).toHaveLength(1); // no duplicate row created
    });

    it('sent promotional allowance cannot be reserved again', async () => {
      const { service } = makeService();

      const first = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(first.success).toBe(true);
      if (!first.success) return;
      await service.markAllowanceSent(first.ledger.id);

      const result = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('already-consumed');
      }
    });

    it('concurrent reservations produce only one successful reservation', async () => {
      const { service } = makeService();

      const results = await Promise.all([
        service.reserveAllowance('alice@example.com', 'promotional'),
        service.reserveAllowance('alice@example.com', 'promotional'),
        service.reserveAllowance('alice@example.com', 'promotional'),
      ]);

      const successes = results.filter((r) => r.success);
      expect(successes).toHaveLength(1);
      for (const s of successes) {
        expect(s.ledger.status).toBe('reserved');
      }

      const failures = results.filter((r) => !r.success);
      expect(failures).toHaveLength(2);
      for (const f of failures) {
        expect(f.reason).toBe('already-reserved');
      }
    });

    it('email normalization is consistent', async () => {
      const { service } = makeService();

      await service.reserveAllowance('  Alice@Example.COM  ', 'promotional');
      const result = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('already-reserved');
      }
    });

    it('invalid category is rejected', async () => {
      const { service } = makeService();

      await expect(
        service.reserveAllowance(
          'alice@example.com',
          'newsletter' as MarketingAllowanceCategory,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAllowanceSent', () => {
    it('transitions reserved to sent and persists provider message id and timestamp', async () => {
      const { service, dataSource } = makeService();

      const reserved = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(reserved.success).toBe(true);
      if (!reserved.success) return;

      const sent = await service.markAllowanceSent(
        reserved.ledger.id,
        'msg-123',
      );

      expect(sent.status).toBe('sent');
      expect(sent.providerMessageId).toBe('msg-123');
      expect(sent.sentAt).toBeInstanceOf(Date);

      const repo = (dataSource as unknown as FakeDataSource).repo;
      const row = repo.rows[0];
      expect(row.status).toBe('sent');
      expect(row.providerMessageId).toBe('msg-123');
      expect(row.sentAt).toBeInstanceOf(Date);
    });

    it('rejects marking an already-sent allowance as sent', async () => {
      const { service } = makeService();

      const reserved = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(reserved.success).toBe(true);
      if (!reserved.success) return;
      await service.markAllowanceSent(reserved.ledger.id);

      await expect(
        service.markAllowanceSent(reserved.ledger.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects marking a failed allowance as sent', async () => {
      const { service } = makeService();

      const reserved = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(reserved.success).toBe(true);
      if (!reserved.success) return;
      await service.markAllowanceFailed(reserved.ledger.id);

      await expect(
        service.markAllowanceSent(reserved.ledger.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws not found for an unknown ledger id', async () => {
      const { service } = makeService();

      await expect(service.markAllowanceSent(99999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllowanceFailed', () => {
    it('transitions reserved to failed and preserves the record', async () => {
      const { service, dataSource } = makeService();

      const reserved = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(reserved.success).toBe(true);
      if (!reserved.success) return;

      const failed = await service.markAllowanceFailed(reserved.ledger.id);

      expect(failed.status).toBe('failed');

      const repo = (dataSource as unknown as FakeDataSource).repo;
      expect(repo.rows).toHaveLength(1);
      expect(repo.rows[0].status).toBe('failed');
    });

    it('rejects marking an already-failed allowance as failed', async () => {
      const { service } = makeService();

      const reserved = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(reserved.success).toBe(true);
      if (!reserved.success) return;
      await service.markAllowanceFailed(reserved.ledger.id);

      await expect(
        service.markAllowanceFailed(reserved.ledger.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects marking a sent allowance as failed', async () => {
      const { service } = makeService();

      const reserved = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(reserved.success).toBe(true);
      if (!reserved.success) return;
      await service.markAllowanceSent(reserved.ledger.id);

      await expect(
        service.markAllowanceFailed(reserved.ledger.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws not found for an unknown ledger id', async () => {
      const { service } = makeService();

      await expect(service.markAllowanceFailed(99999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('queries', () => {
    it('isReserved and isConsumed reflect the ledger state', async () => {
      const { service } = makeService();

      expect(await service.isReserved('alice@example.com', 'promotional')).toBe(
        false,
      );
      expect(await service.isConsumed('alice@example.com', 'promotional')).toBe(
        false,
      );

      const reserved = await service.reserveAllowance(
        'alice@example.com',
        'promotional',
      );
      expect(reserved.success).toBe(true);
      if (!reserved.success) return;
      expect(await service.isReserved('alice@example.com', 'promotional')).toBe(
        true,
      );

      await service.markAllowanceSent(reserved.ledger.id);
      expect(await service.isReserved('alice@example.com', 'promotional')).toBe(
        false,
      );
      expect(await service.isConsumed('alice@example.com', 'promotional')).toBe(
        true,
      );
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { AudienceService } from './audience.service';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

type QueryRow = { email: string; total: string };

/**
 * DataSource double that records every raw query. The service issues a single
 * set-based SQL statement per preview, so the test asserts on the SQL text
 * and parameters rather than on repository calls.
 */
class RecordingDataSource {
  readonly calls: Array<{ sql: string; params?: Array<unknown> }> = [];

  constructor(private readonly rows: QueryRow[]) {}

  query(sql: string, params?: Array<unknown>) {
    this.calls.push({ sql, params });
    return Promise.resolve(this.rows);
  }
}

function makeSubscribers(count: number): QueryRow[] {
  // Simulate SQL that returns COUNT(*) OVER() with LIMIT 5.
  return Array.from({ length: Math.min(5, count) }, (_, index) => ({
    email: `subscriber${index + 1}@example.com`,
    total: String(count),
  }));
}

function makeService(count: number) {
  const dataSource = new RecordingDataSource(makeSubscribers(count));
  const service = new AudienceService(dataSource as unknown as DataSource);
  return { service, dataSource };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AudienceService', () => {
  describe('countEligible query behaviour', () => {
    it.each([0, 1, 5, 50, 250])(
      'issues exactly one subscriber query for %i subscribers',
      async (count) => {
        const { service, dataSource } = makeService(count);

        const result = await service.countEligible({});

        expect(dataSource.calls).toHaveLength(1);
        expect(result.count).toBe(count);
      },
    );

    it('scopes the preview to subscribed subscribers with valid emails', async () => {
      const { service, dataSource } = makeService(3);

      await service.countEligible({});

      expect(dataSource.calls[0].sql).toContain(`n.status = 'subscribed'`);
    });

    it('does not add queries when audience filters are supplied', async () => {
      const { service, dataSource } = makeService(20);

      await service.countEligible({
        firstTimePurchaser: {},
        repeatPurchaser: {},
        noRecentPurchase: { days: 30 },
        ltv: { min: 100, max: 500 },
        productIds: ['1', '2'],
        categories: ['tea'],
      });

      expect(dataSource.calls).toHaveLength(1);
      const { sql, params } = dataSource.calls[0];
      expect(sql).toContain('s.order_count = 1');
      expect(sql).toContain('s.order_count >= 2');
      expect(sql).toContain('COALESCE(s.ltv, 0) >=');
      expect(sql).toContain('COALESCE(s.ltv, 0) <=');
      expect(sql).toContain('f.product_ids &&');
      expect(sql).toContain('f.categories &&');
      expect(sql).toContain("INTERVAL '1 day'");
      expect(params).toContain(30);
      expect(params).toContain('100');
      expect(params).toContain('500');
      expect(params).toContainEqual([1, 2]);
      expect(params).toContainEqual(['tea']);
    });

    it('omits purchase CTEs when no purchase filter is supplied', async () => {
      const { service, dataSource } = makeService(20);

      await service.countEligible({ categories: [], productIds: [] });

      expect(dataSource.calls).toHaveLength(1);
      expect(dataSource.calls[0].sql).not.toContain('qualifying_orders');
    });
  });

  describe('input validation', () => {
    it('rejects an invalid noRecentPurchase days value', async () => {
      const { service } = makeService(0);

      await expect(
        service.countEligible({ noRecentPurchase: { days: 'abc' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a negative noRecentPurchase days value', async () => {
      const { service } = makeService(0);

      await expect(
        service.countEligible({ noRecentPurchase: { days: -1 } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid product ID', async () => {
      const { service } = makeService(0);

      await expect(
        service.countEligible({ productIds: ['not-an-id'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an LTV maximum below the minimum', async () => {
      const { service } = makeService(0);

      await expect(
        service.countEligible({ ltv: { min: 100, max: 10 } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates noRecentPurchase through validateAudienceDefinition', () => {
      const { service } = makeService(0);

      expect(() =>
        service.validateAudienceDefinition({
          noRecentPurchase: { days: -1 },
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        service.validateAudienceDefinition({
          noRecentPurchase: { days: 30 },
        }),
      ).not.toThrow();
    });
  });

  describe('eligibility and response shape', () => {
    it('returns a masked sample of at most five emails', async () => {
      const { service } = makeService(7);

      const result = await service.countEligible({});

      expect(result.count).toBe(7);
      expect(result.sampleEmails).toHaveLength(5);
      expect(result.sampleEmails[0]).toBe('sub***@example.com');
      expect(result.sampleEmails[0]).not.toContain('subscriber1');
    });

    it('masks short local-part emails using the existing masking rule', async () => {
      const dataSource = new RecordingDataSource([
        { email: 'abc@example.com', total: '2' },
        { email: 'ab@example.com', total: '2' },
      ]);
      const service = new AudienceService(dataSource as unknown as DataSource);

      const result = await service.countEligible({});

      expect(result.sampleEmails).toEqual(['abc***', 'ab@***']);
      expect(result.count).toBe(2);
    });

    it('returns an empty result when there are no subscribers', async () => {
      const { service } = makeService(0);

      const result = await service.countEligible({});

      expect(result).toEqual({ count: 0, sampleEmails: [] });
    });
  });
});

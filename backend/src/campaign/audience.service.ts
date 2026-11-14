import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const ALLOWED_FILTER_KEYS = [
  'firstTimePurchaser',
  'repeatPurchaser',
  'noRecentPurchase',
  'ltv',
  'productIds',
  'categories',
];

/** Filters that read purchase history and therefore need order CTEs. */
interface ParsedFilters {
  firstTimePurchaser?: boolean;
  repeatPurchaser?: boolean;
  noRecentPurchaseDays?: number;
  ltvMin?: number;
  ltvMax?: number;
  productIds?: number[];
  categories?: string[];
}

/** Minimal raw-SQL executor shared by DataSource and transaction managers. */
interface QueryExecutor {
  query<T = unknown>(query: string, parameters?: unknown[]): Promise<T>;
}

/**
 * Segments the newsletter audience for a campaign based on optional filters.
 *
 * Filters apply AND logic together. An empty/filter-less definition returns
 * all confirmed subscribers who are not unsubscribed.
 *
 * Segmentation runs as a single set-based SQL query: subscribed subscribers
 * are matched against aggregated qualifying-purchase CTEs, so the query count
 * does not grow with the subscriber count and no orders or order items are
 * loaded into application memory.
 */
@Injectable()
export class AudienceService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /** Validate and normalise an audience definition. */
  validateDefinition(
    definition: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!definition) {
      return { filters: {} };
    }

    const filters: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(definition)) {
      if (ALLOWED_FILTER_KEYS.includes(key)) {
        filters[key] = value;
      }
    }

    return { filters };
  }

  /** Validate the audience definition and throw on invalid input. */
  validateAudienceDefinition(definition: Record<string, unknown>): void {
    if (!definition) {
      return; // empty is valid = all eligible subscribers
    }

    // Check for unsupported top-level keys
    for (const key of Object.keys(definition)) {
      if (!ALLOWED_FILTER_KEYS.includes(key)) {
        throw new BadRequestException(
          `Unsupported audience filter: "${key}". ` +
            `Supported filters are: ${ALLOWED_FILTER_KEYS.join(', ')}.`,
        );
      }
    }

    // Validate product IDs if present
    if (definition.productIds) {
      for (const id of this.asList(definition.productIds)) {
        if (typeof id !== 'number' && typeof id !== 'string') {
          throw new BadRequestException(
            `Invalid product ID: ${this.previewValue(id)}. Product IDs must be positive integers.`,
          );
        }
        if (!/^\d+$/.test(String(id))) {
          throw new BadRequestException(
            `Invalid product ID: "${String(id)}". Product IDs must be positive integers.`,
          );
        }
      }
    }

    // Validate categories if present
    if (definition.categories) {
      for (const cat of this.asList(definition.categories)) {
        if (typeof cat !== 'string' || cat.trim().length === 0) {
          throw new BadRequestException(
            `Invalid category value. Categories must be non-empty strings.`,
          );
        }
      }
    }

    // Validate LTV bounds if present
    if (definition.ltv) {
      const ltv = this.asObject(definition.ltv, 'ltv');
      const min = this.optionalNumber(ltv.min);
      const max = this.optionalNumber(ltv.max);
      if (ltv.min !== undefined && (min === undefined || min < 0)) {
        throw new BadRequestException(
          `Invalid LTV minimum: "${this.previewValue(ltv.min)}". Must be a non-negative number.`,
        );
      }
      if (ltv.max !== undefined && (max === undefined || max < 0)) {
        throw new BadRequestException(
          `Invalid LTV maximum: "${this.previewValue(ltv.max)}". Must be a non-negative number.`,
        );
      }
      if (min !== undefined && max !== undefined && min > max) {
        throw new BadRequestException(
          `LTV maximum must be greater than or equal to minimum.`,
        );
      }
    }

    // Validate noRecentPurchase days if present
    if (definition.noRecentPurchase) {
      const config = this.asObject(
        definition.noRecentPurchase,
        'noRecentPurchase',
      );
      const days = this.optionalNumber(config.days);
      if (days === undefined || days < 0) {
        throw new BadRequestException(
          `Invalid noRecentPurchase days: "${this.previewValue(config.days)}". Must be a non-negative number.`,
        );
      }
    }
  }

  /**
   * Compute eligible recipient count and sample emails for a given
   * audience definition against the subscriber base.
   *
   * Returns the count of subscribers matching ALL filters (AND logic),
   * and a sample of their masked email addresses.
   */
  async countEligible(
    filters: Record<string, unknown>,
  ): Promise<{ count: number; sampleEmails: string[] }> {
    const parsed = this.parseFilters(filters);
    const { sql, params } = this.buildPreviewQuery(parsed);

    const rows = await this.dataSource.query<
      Array<{ email: string; total: string | number }>
    >(sql, params);

    const totalRow = rows[0];
    const count = totalRow ? Number(totalRow.total) : 0;
    const sampleEmails = rows.map((row) => this.maskEmail(row.email));

    return { count, sampleEmails };
  }

  private asObject(value: unknown, name: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new BadRequestException(
        `Invalid ${name} value. Expected an object.`,
      );
    }
    return value as Record<string, unknown>;
  }

  /** Parses a number, returning undefined when absent/null and NaN-safe. */
  private optionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  /** Normalises a single-or-array value into a list. */
  private asList(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [value];
  }

  /** Renders an unknown filter value safely for error messages. */
  private previewValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      return String(value);
    }
    try {
      const serialized = JSON.stringify(value);
      return serialized === undefined ? 'unknown' : serialized;
    } catch {
      return 'unknown';
    }
  }

  private asStringArray(value: unknown, name: string): string[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const strings: string[] = [];
    for (const item of this.asList(value)) {
      if (typeof item === 'string') {
        strings.push(item);
      } else if (typeof item === 'number' || typeof item === 'boolean') {
        strings.push(String(item));
      } else {
        throw new BadRequestException(
          `Invalid ${name} value: ${this.previewValue(item)}. Expected an array of strings.`,
        );
      }
    }
    return strings;
  }

  /**
   * Parses and validates the supplied filter object. Throws on malformed
   * values so the preview API rejects bad input instead of silently
   * returning an unfiltered audience.
   */
  private parseFilters(
    filters: Record<string, unknown> | null | undefined,
  ): ParsedFilters {
    const parsed: ParsedFilters = {};

    if (filters?.firstTimePurchaser !== undefined) {
      this.asObject(filters.firstTimePurchaser, 'firstTimePurchaser');
      parsed.firstTimePurchaser = true;
    }

    if (filters?.repeatPurchaser !== undefined) {
      this.asObject(filters.repeatPurchaser, 'repeatPurchaser');
      parsed.repeatPurchaser = true;
    }

    if (filters?.noRecentPurchase !== undefined) {
      const config = this.asObject(
        filters.noRecentPurchase,
        'noRecentPurchase',
      );
      const days = this.optionalNumber(config.days);
      if (days === undefined || days < 0) {
        throw new BadRequestException(
          `Invalid noRecentPurchase days: "${this.previewValue(config.days)}". Must be a non-negative number.`,
        );
      }
      parsed.noRecentPurchaseDays = days;
    }

    if (filters?.ltv !== undefined) {
      const ltv = this.asObject(filters.ltv, 'ltv');
      const min = this.optionalNumber(ltv.min);
      const max = this.optionalNumber(ltv.max);
      if (ltv.min !== undefined && (min === undefined || min < 0)) {
        throw new BadRequestException(
          `Invalid LTV minimum: "${this.previewValue(ltv.min)}". Must be a non-negative number.`,
        );
      }
      if (ltv.max !== undefined && (max === undefined || max < 0)) {
        throw new BadRequestException(
          `Invalid LTV maximum: "${this.previewValue(ltv.max)}". Must be a non-negative number.`,
        );
      }
      if (min !== undefined && max !== undefined && min > max) {
        throw new BadRequestException(
          `LTV maximum must be greater than or equal to minimum.`,
        );
      }
      parsed.ltvMin = min;
      parsed.ltvMax = max;
    }

    const productIds = this.asStringArray(filters?.productIds, 'productIds');
    if (productIds && productIds.length > 0) {
      for (const id of productIds) {
        if (!/^\d+$/.test(id)) {
          throw new BadRequestException(
            `Invalid product ID: "${id}". Product IDs must be positive integers.`,
          );
        }
      }
      parsed.productIds = [...new Set(productIds.map(Number))];
    }

    const categories = this.asStringArray(filters?.categories, 'categories');
    if (categories && categories.length > 0) {
      const normalized = categories
        .map((category) => category.trim().toLowerCase())
        .filter((category) => category.length > 0);
      if (normalized.length === 0) {
        throw new BadRequestException(
          `Invalid category value. Categories must be non-empty strings.`,
        );
      }
      parsed.categories = [...new Set(normalized)];
    }

    return parsed;
  }

  /**
   * Builds the eligible-subscriber CTEs, joins, conditions and parameters.
   *
   * Shared by the preview query and the keyset-paginated recipient iterator
   * used for campaign sending. One query per batch; no orders or order items
   * are loaded into application memory.
   *
   * Identity matching: every qualifying order contributes
   * (order_id, normalized_email) pairs for the checkout email and, for
   * customer-linked orders, for the account email. The UNION removes exact
   * duplicates, so an order that appears under both identities counts once
   * per email and never twice.
   */
  private buildEligibility(parsed: ParsedFilters): {
    ctes: string[];
    joins: string[];
    conditions: string[];
    params: Array<string | number | number[] | string[]>;
  } {
    const params: Array<string | number | number[] | string[]> = [];
    const ctes: string[] = [];
    const joins: string[] = [];
    const conditions: string[] = [
      `n.status = 'subscribed'`,
      `lower(btrim(n.email)) ~ '^[^@[:space:]]+@[^@[:space:]]+$'`,
    ];

    const needsStats =
      parsed.firstTimePurchaser !== undefined ||
      parsed.repeatPurchaser !== undefined ||
      parsed.noRecentPurchaseDays !== undefined ||
      parsed.ltvMin !== undefined ||
      parsed.ltvMax !== undefined;
    const needsProductFlags =
      (parsed.productIds?.length ?? 0) > 0 ||
      (parsed.categories?.length ?? 0) > 0;

    if (needsStats || needsProductFlags) {
      // Qualifying orders: paid, not cancelled. Refunded orders are excluded
      // by requiring payment_status = 'paid'.
      ctes.push(`qualifying_orders AS (
  SELECT id, customer_email, customer_id,
         COALESCE(paid_at, created_at) AS purchased_at
  FROM orders
  WHERE payment_status = 'paid'
    AND order_status <> 'cancelled'
)`);
      // Each qualifying order maps to the normalised emails of the checkout
      // snapshot and (for customer-linked orders) the account email.
      ctes.push(`order_identity AS (
  SELECT DISTINCT id AS order_id, lower(btrim(customer_email)) AS email
  FROM qualifying_orders
  WHERE btrim(customer_email) <> ''
  UNION
  SELECT DISTINCT qo.id, lower(btrim(c.email)) AS email
  FROM qualifying_orders qo
  JOIN customers c ON c.id = qo.customer_id
  WHERE btrim(c.email) <> ''
)`);
    }

    if (needsStats) {
      ctes.push(`email_stats AS (
  SELECT
    oi.email,
    COUNT(DISTINCT oi.order_id) AS order_count,
    COALESCE(SUM(items.order_total), 0) AS ltv,
    MAX(qo.purchased_at) AS last_purchased_at
  FROM order_identity oi
  JOIN qualifying_orders qo ON qo.id = oi.order_id
  LEFT JOIN (
    SELECT order_id, SUM(line_total) AS order_total
    FROM order_items
    GROUP BY order_id
  ) items ON items.order_id = qo.id
  GROUP BY oi.email
)`);
      joins.push(`LEFT JOIN email_stats s ON s.email = lower(btrim(n.email))`);
    }

    if (needsProductFlags) {
      // Categories come from the current Product record; items whose product
      // was deleted (product_id SET NULL) or is missing are simply not
      // matched and never fail the query.
      ctes.push(`email_product_flags AS (
  SELECT
    oi.email,
    array_agg(DISTINCT p.id) AS product_ids,
    array_agg(DISTINCT lower(p.category)) AS categories
  FROM order_identity oi
  JOIN order_items it ON it.order_id = oi.order_id
  JOIN products p ON p.id = it.product_id
  GROUP BY oi.email
)`);
      joins.push(
        `LEFT JOIN email_product_flags f ON f.email = lower(btrim(n.email))`,
      );
    }

    if (parsed.firstTimePurchaser) {
      conditions.push(`s.order_count = 1`);
    }

    if (parsed.repeatPurchaser) {
      conditions.push(`s.order_count >= 2`);
    }

    if (parsed.noRecentPurchaseDays !== undefined) {
      params.push(parsed.noRecentPurchaseDays);
      conditions.push(
        `(s.email IS NULL OR s.last_purchased_at < NOW() - ($${params.length} * INTERVAL '1 day'))`,
      );
    }

    if (parsed.ltvMin !== undefined) {
      params.push(String(parsed.ltvMin));
      conditions.push(`COALESCE(s.ltv, 0) >= $${params.length}`);
    }

    if (parsed.ltvMax !== undefined) {
      params.push(String(parsed.ltvMax));
      conditions.push(`COALESCE(s.ltv, 0) <= $${params.length}`);
    }

    if (parsed.productIds && parsed.productIds.length > 0) {
      params.push(parsed.productIds);
      conditions.push(`f.product_ids && $${params.length}::int[]`);
    }

    if (parsed.categories && parsed.categories.length > 0) {
      params.push(parsed.categories);
      conditions.push(`f.categories && $${params.length}::text[]`);
    }

    return { ctes, joins, conditions, params };
  }

  /**
   * Builds the set-based preview query.
   *
   * One query is issued per preview regardless of subscriber count: the
   * eligible set is computed by joining subscribed subscribers against
   * grouped CTEs of qualifying purchases, and a window count returns the
   * full total alongside the first five sample emails.
   */
  private buildPreviewQuery(parsed: ParsedFilters): {
    sql: string;
    params: Array<string | number | number[] | string[]>;
  } {
    const { ctes, joins, conditions, params } = this.buildEligibility(parsed);
    const withClause = ctes.length > 0 ? `WITH ${ctes.join(',\n')}\n` : '';
    const sql = `${withClause}SELECT n.email AS email, COUNT(*) OVER() AS total
FROM newsletter_subscriptions n
${joins.join('\n')}
WHERE ${conditions.join('\n  AND ')}
ORDER BY n.id
LIMIT 5`;

    return { sql, params };
  }

  /**
   * Streams the eligible recipients in id-ordered batches using keyset
   * pagination, so a campaign send never holds the full audience in memory.
   * Pass a transaction manager to read a consistent snapshot.
   */
  async *iterateEligibleRecipients(
    definition: Record<string, unknown> | null | undefined,
    batchSize = 200,
    manager?: QueryExecutor,
  ): AsyncGenerator<Array<{ id: number; email: string }>> {
    const parsed = this.parseFilters(definition);
    const { ctes, joins, conditions, params } = this.buildEligibility(parsed);
    const withClause = ctes.length > 0 ? `WITH ${ctes.join(',\n')}\n` : '';
    const executor: QueryExecutor = manager ?? this.dataSource;
    let lastId = 0;
    for (;;) {
      const sql = `${withClause}SELECT n.id AS id, n.email AS email
FROM newsletter_subscriptions n
${joins.join('\n')}
WHERE ${[...conditions, `n.id > $${params.length + 1}`].join('\n  AND ')}
ORDER BY n.id
LIMIT $${params.length + 2}`;
      const batchParams: Array<string | number | number[] | string[]> = [
        ...params,
        lastId,
        batchSize,
      ];
      const rows = await executor.query<
        Array<{ id: number | string; email: string }>
      >(sql, batchParams);
      const batch = rows.map((row) => ({
        id: Number(row.id),
        email: row.email,
      }));
      if (batch.length === 0) {
        break;
      }
      yield batch;
      if (batch.length < batchSize) {
        break;
      }
      lastId = batch[batch.length - 1].id;
    }
  }

  private maskEmail(email: string): string {
    const domainIndex = email.indexOf('@');
    if (domainIndex > 3) {
      return email.substring(0, 3) + '***' + email.substring(domainIndex);
    }
    return email.substring(0, 3) + '***';
  }
}

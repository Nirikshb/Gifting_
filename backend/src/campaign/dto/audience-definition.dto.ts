import { IsOptional, IsString, IsArray, IsObject } from 'class-validator';

/**
 * Valid audience definition for campaign segmentation.
 *
 * All filters are optional. When multiple are supplied, they are applied
 * together using AND logic. An empty definition means all eligible
 * subscribers (confirmed, not unsubscribed).
 */
export class AudienceDefinitionDto {
  /** Filter: first-time purchaser (exactly one qualifying order). */
  @IsOptional()
  @IsObject()
  firstTimePurchaser?: Record<string, unknown>;

  /** Filter: repeat purchaser (at least two qualifying orders). */
  @IsOptional()
  @IsObject()
  repeatPurchaser?: Record<string, unknown>;

  /** Filter: no recent purchase within N days. */
  @IsOptional()
  @IsObject()
  noRecentPurchase?: Record<string, unknown>;

  /** Filter: lifetime spend range. */
  @IsOptional()
  @IsObject()
  ltv?: Record<string, unknown>;

  /** Filter: product IDs purchased. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  /** Filter: product categories purchased. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

/**
 * Query DTO for the audience preview endpoint.
 */
export class AudiencePreviewQueryDto {
  /** The audience definition to preview. */
  @IsObject()
  audienceDefinition: Record<string, unknown> = {};
}

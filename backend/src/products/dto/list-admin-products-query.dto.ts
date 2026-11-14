import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimString } from './create-product.dto';

export const PRODUCT_AVAILABILITY_FILTERS = [
  'all',
  'active',
  'inactive',
] as const;
export type ProductAvailabilityFilter =
  (typeof PRODUCT_AVAILABILITY_FILTERS)[number];

export const PRODUCT_STOCK_FILTERS = ['all', 'in', 'low', 'out'] as const;
export type ProductStockFilter = (typeof PRODUCT_STOCK_FILTERS)[number];

export class ListAdminProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  /** Matches the product name or its slug. */
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsIn(PRODUCT_AVAILABILITY_FILTERS)
  availability?: ProductAvailabilityFilter;

  @IsOptional()
  @IsIn(PRODUCT_STOCK_FILTERS)
  stock?: ProductStockFilter;
}

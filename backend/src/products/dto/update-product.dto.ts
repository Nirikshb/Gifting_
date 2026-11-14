import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { priceToString, trimString } from './create-product.dto';
import { PRODUCT_PRICE_PATTERN } from '../utils/product-validation';

/**
 * Stock is intentionally not part of this payload. Stock changes go through
 * the dedicated stock endpoint so every change carries a reason and lands in
 * the adjustment history.
 */
export class UpdateProductDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Transform(priceToString)
  @IsString()
  @Matches(PRODUCT_PRICE_PATTERN, {
    message:
      'price must be a positive amount with up to two decimal places (for example 249 or 249.50)',
  })
  price?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** `null` removes the current image. */
  @IsOptional()
  @IsInt()
  @Min(1)
  imageId?: number | null;
}

import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimString } from './create-product.dto';
import { MAX_STOCK_QUANTITY } from '../utils/product-validation';

export class UpdateStockDto {
  /** New available quantity. The current value is never overwritten silently. */
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK_QUANTITY)
  stockQuantity!: number;

  /** Why the stock changed. Stored with the adjustment. */
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

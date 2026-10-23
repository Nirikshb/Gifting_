import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const POSTGRES_INTEGER_MAX = 2147483647;

export class CreateOrderLineItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(POSTGRES_INTEGER_MAX)
  quantity!: number;
}

export class CreateOrderDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  customerName!: string;

  @IsEmail()
  @MaxLength(255)
  customerEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  deliveryLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deliveryLine2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deliveryCity!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  deliveryPostcode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deliveryCountry!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineItemDto)
  items!: CreateOrderLineItemDto[];
}

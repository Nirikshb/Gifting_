import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCheckoutDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  customerName!: string;

  @IsEmail()
  @MaxLength(255)
  customerEmail!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(150)
  recipientName?: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  deliveryLine1!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(200)
  deliveryLine2?: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deliveryCity!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  deliveryPostcode!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deliveryCountry!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  giftMessage?: string;

  /**
   * Client-generated key used to make checkout retries safe. The same key never
   * creates a second order.
   */
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]{8,64}$/, {
    message: 'idempotencyKey must be 8-64 characters of letters, digits, - or _',
  })
  idempotencyKey?: string;
}

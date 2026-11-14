import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NOTIFICATION_EVENT_TYPES } from '../../notifications/entities/email-outbox.entity';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListEmailActivityQueryDto {
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
  limit = 25;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  recipient?: string;

  @IsOptional()
  @IsIn(NOTIFICATION_EVENT_TYPES)
  eventType?: (typeof NOTIFICATION_EVENT_TYPES)[number];

  @IsOptional()
  @IsIn(['pending', 'sending', 'sent', 'failed'])
  status?: string;

  @IsOptional()
  @Transform(trimString)
  @IsDateString()
  @IsString()
  from?: string;

  @IsOptional()
  @Transform(trimString)
  @IsDateString()
  @IsString()
  to?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  search?: string;
}

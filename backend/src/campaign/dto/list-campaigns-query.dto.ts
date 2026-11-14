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
import { CAMPAIGN_STATUSES } from '../entities/campaign.entity';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListCampaignsQueryDto {
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
  @IsIn(CAMPAIGN_STATUSES)
  status?: (typeof CAMPAIGN_STATUSES)[number];

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  search?: string;
}

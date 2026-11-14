import { Transform } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Update a draft campaign.
 *
 * Only drafts can be edited. `status`, `scheduledAt` and `sentAt` are managed
 * by the schedule/cancel endpoints and are not updatable here.
 */
export class UpdateCampaignDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  heading?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  ctaLabel?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  ctaUrl?: string;

  @IsOptional()
  @IsObject()
  audienceDefinition?: Record<string, unknown>;
}

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
 * Create a new campaign as a draft.
 *
 * Content is a plain-text body rendered inside the code-controlled branded
 * template at send time. Arbitrary executable HTML is not accepted.
 */
export class CreateCampaignDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  name!: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  subject!: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  heading!: string;

  @Transform(trimString)
  @IsString()
  content!: string;

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

import { Transform } from 'class-transformer';
import { IsDateString, IsString } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Schedule a draft campaign for a future date.
 *
 * Scheduled execution (worker/cron) is out of scope: this only stores the
 * scheduled date.
 */
export class ScheduleCampaignDto {
  @Transform(trimString)
  @IsDateString()
  @IsString()
  scheduledAt!: string;
}

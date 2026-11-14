import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, MaxLength } from 'class-validator';

export class CreateNewsletterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email!: string;

  /**
   * Explicit marketing consent. Double opt-in: the subscription only becomes
   * real once the recipient confirms via the emailed token.
   */
  @IsBoolean()
  consent!: boolean;
}

import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SendTestEmailDto {
  @Transform(trimString)
  @IsEmail()
  @MaxLength(255)
  recipient!: string;
}

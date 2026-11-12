import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CancelOrderDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  reason?: string;
}

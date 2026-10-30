import { Type } from 'class-transformer';
import { IsInt, IsPositive, Max } from 'class-validator';
import { POSTGRES_INTEGER_MAX } from '../../orders/dto/create-order.dto';

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(POSTGRES_INTEGER_MAX)
  quantity!: number;
}

import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleSignInDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  credential!: string;
}

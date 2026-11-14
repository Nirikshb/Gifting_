import { IsEmail, IsString, MaxLength } from 'class-validator';

export class ConfirmNewsletterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MaxLength(255)
  token!: string;
}

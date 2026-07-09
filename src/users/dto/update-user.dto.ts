import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

// A01: Whitelist estricta para update de perfil — evita mass assignment
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}

import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Email obligatorio' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Código obligatorio' })
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code: string;
}

import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email obligatorio' })
  email: string;

  @IsNotEmpty({ message: 'Contraseña obligatoria' })
  password: string;
}

import { IsNotEmpty, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email obligatorio' })
  email: string;

  @IsNotEmpty({ message: 'Contraseña obligatoria' })
  password: string;
}

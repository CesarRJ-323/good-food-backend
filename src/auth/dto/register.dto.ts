import { IsEmail, IsNotEmpty, MinLength, Matches, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email obligatorio' })
  email: string;

  @IsNotEmpty({ message: 'Contraseña obligatoria' })
  @MinLength(8, { message: 'Mínimo 8 caracteres' })
  @Matches(/[A-Z]/, { message: 'Debe tener 1 mayúscula' })
  @Matches(/[0-9]/, { message: 'Debe tener 1 número' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nombre obligatorio' })
  @Length(2, 100, { message: 'Nombre entre 2 y 100 caracteres' })
  name: string;
}

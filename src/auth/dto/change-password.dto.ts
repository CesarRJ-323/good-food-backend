import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Contraseña actual obligatoria' })
  currentPassword: string;

  @IsNotEmpty({ message: 'Contraseña nueva obligatoria' })
  @MinLength(8, { message: 'Mínimo 8 caracteres' })
  @Matches(/[A-Z]/, { message: 'Debe tener 1 mayúscula' })
  @Matches(/[0-9]/, { message: 'Debe tener 1 número' })
  newPassword: string;
}

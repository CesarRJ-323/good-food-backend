import { IsString, IsNotEmpty, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Nombre obligatorio' })
  @Length(2, 100, { message: 'Nombre entre 2 y 100 caracteres' })
  name: string;
}

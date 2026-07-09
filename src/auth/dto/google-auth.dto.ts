import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsNotEmpty({ message: 'idToken obligatorio' })
  @IsString()
  idToken: string;
}

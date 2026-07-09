import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty({ message: 'Fecha obligatoria' })
  date: string;

  @IsString()
  @IsNotEmpty({ message: 'Hora obligatoria' })
  time: string;

  @IsInt()
  @Min(1)
  @Max(30)
  guests?: number;

  @IsString()
  specifications?: string;

  noSpecifications?: boolean;
}

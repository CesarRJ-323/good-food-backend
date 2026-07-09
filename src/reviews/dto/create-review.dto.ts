import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, MaxLength } from 'class-validator';

// A03: Validación real con class-validator (antes era un type suelto sin validación)
export class CreateReviewDto {
  @IsString()
  @IsNotEmpty({ message: 'El plato es obligatorio' })
  dishId: string;

  @IsInt()
  @Min(1, { message: 'El puntaje mínimo es 1' })
  @Max(5, { message: 'El puntaje máximo es 5' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'El comentario no puede superar 500 caracteres' })
  comment?: string;
}

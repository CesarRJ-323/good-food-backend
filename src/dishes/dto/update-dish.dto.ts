import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateDishDto } from './create-dish.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDishDto extends PartialType(CreateDishDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

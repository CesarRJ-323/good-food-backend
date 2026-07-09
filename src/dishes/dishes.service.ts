import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  list(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.prisma.dish.findMany({
      where: { active: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, category: true, price: true, imageUrl: true, description: true },
    });
  }

  findOne(id: string) {
    return this.prisma.dish.findUnique({ where: { id } });
  }

  create(dto: CreateDishDto) {
    return this.prisma.dish.create({
      data: {
        name: dto.name,
        category: dto.category,
        price: dto.price,
        description: dto.description,
        imageUrl: dto.imageUrl,
      },
    });
  }

  update(id: string, dto: UpdateDishDto) {
    return this.prisma.dish.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.dish.update({ where: { id }, data: { active: false } });
  }
}

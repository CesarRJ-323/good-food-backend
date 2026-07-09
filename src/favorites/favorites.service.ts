import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { dish: { select: { id: true, name: true, price: true, imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async add(userId: string, dto: { dishId: string }) {
    const exists = await this.prisma.favorite.findFirst({
      where: { userId, dishId: dto.dishId },
    });
    if (exists) return exists;
    const dish = await this.prisma.dish.findUnique({ where: { id: dto.dishId } });
    if (!dish) throw new NotFoundException('Plato no encontrado');
    return this.prisma.favorite.create({
      data: { userId, dishId: dto.dishId },
      include: { dish: { select: { id: true, name: true, price: true, imageUrl: true } } },
    });
  }

  async remove(userId: string, dishId: string) {
    const fav = await this.prisma.favorite.findFirst({
      where: { userId, dishId },
    });
    if (!fav) return { deleted: true };
    await this.prisma.favorite.delete({ where: { id: fav.id } });
    return { deleted: true };
  }
}

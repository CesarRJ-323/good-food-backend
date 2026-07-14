import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // A06: Upsert — un usuario tiene una sola reseña por plato (@@unique en el
  // schema). Si ya existe, la ACTUALIZA en lugar de rechazar con 409, para que
  // pueda corregir/editar su reseña (comportamiento esperado en la demo).
  async create(userId: string, dto: CreateReviewDto) {
    // A03: Validar que el plato exista antes de crear la reseña. Sin esto,
    // un dishId inexistente hace que Prisma falle con error de FK -> 500.
    // Devolvemos 400 limpio en su lugar.
    const dish = await this.prisma.dish.findUnique({
      where: { id: dto.dishId },
      select: { id: true },
    });
    if (!dish) {
      throw new BadRequestException('El plato indicado no existe.');
    }

    const existing = await this.prisma.review.findFirst({
      where: { userId, dishId: dto.dishId },
    });

    if (existing) {
      return this.prisma.review.update({
        where: { id: existing.id },
        data: { rating: dto.rating, comment: dto.comment },
      });
    }

    return this.prisma.review.create({
      data: {
        userId,
        dishId: dto.dishId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  // A01: No exponer email del usuario en las reseñas públicas
  findByDish(dishId: string) {
    return this.prisma.review.findMany({
      where: { dishId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // Reseñas del usuario logueado (para "Historial de reseñas" en el frontend)
  findByUser(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: { dish: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

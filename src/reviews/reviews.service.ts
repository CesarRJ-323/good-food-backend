import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const exists = await this.prisma.review.findFirst({ where: { userId, dishId: dto.dishId } });
    if (exists) throw new ConflictException('Ya dejaste una reseña para este plato.');
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
}

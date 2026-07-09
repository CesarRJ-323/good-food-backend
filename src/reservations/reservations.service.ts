import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReservationDto) {
    const payload = {
      userId,
      date: new Date(dto.date),
      time: dto.time,
      guests: dto.guests ?? 2,
      specifications: dto.noSpecifications ? null : dto.specifications,
    };
    return this.prisma.reservation.create({ data: payload });
  }

  findByUser(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }
}

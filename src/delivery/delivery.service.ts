import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

export type CreateOrderData = {
  address: string;
  paymentMethod: string;
  note?: string;
  items: { dishId: string; quantity: number }[];
};

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateOrderDto) {
    const dishes = await this.prisma.dish.findMany({
      where: { id: { in: data.items.map((x) => x.dishId) }, active: true },
      select: { id: true, price: true },
    });
    const prices = new Map(dishes.map((d) => [d.id, d.price]));
    let total = 0;
    for (const item of data.items) {
      const unit = prices.get(item.dishId) ?? 0;
      total += unit * item.quantity;
    }
    return this.prisma.deliveryOrder.create({
      data: {
        userId,
        address: data.address,
        paymentMethod: data.paymentMethod ?? 'efectivo',
        note: data.note,
        total,
        items: {
          create: data.items.map((item) => ({
            dishId: item.dishId,
            quantity: item.quantity,
            unitPrice: prices.get(item.dishId) ?? 0,
          })),
        },
      },
      include: { items: true },
    });
  }

  findById(userId: string, id: string) {
    return this.prisma.deliveryOrder.findFirst({
      where: { id, userId },
      include: { items: { include: { dish: true } } },
    });
  }

  findByUser(userId: string) {
    return this.prisma.deliveryOrder.findMany({
      where: { userId },
      include: { items: { include: { dish: true } } },
    });
  }
}

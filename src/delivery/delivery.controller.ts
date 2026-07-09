import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @UseGuards(JwtAuthGuard)
  @Post('orders')
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.service.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id')
  find(@Request() req: any, @Param('id') id: string) {
    return this.service.findById(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  list(@Request() req: any) {
    return this.service.findByUser(req.user.id);
  }
}

import { Controller, Get, Post, Delete, Body, UseGuards, Request, Param } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  mine(@Request() req: any) {
    return this.service.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  add(@Request() req: any, @Body() dto: AddFavoriteDto) {
    return this.service.add(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':dishId')
  remove(@Request() req: any, @Param('dishId') dishId: string) {
    return this.service.remove(req.user.id, dishId);
  }
}

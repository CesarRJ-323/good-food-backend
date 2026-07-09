import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: CreateReviewDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('dish/:dishId')
  list(@Param('dishId') dishId: string) {
    return this.service.findByDish(dishId);
  }
}

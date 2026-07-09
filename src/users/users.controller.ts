import { Controller, Get, Post, Body, Param, UseGuards, Request, Put, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/admin.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Request() req: any) {
    return this.users.profile(req.user.id);
  }

  // A01: Solo el usuario puede actualizar su propio perfil
  // UpdateUserDto con whitelist evita mass assignment (role, email, etc)
  @Put('me')
  update(@Request() req: any, @Body() dto: UpdateUserDto) {
    return this.users.update(req.user.id, dto);
  }

  // A01: Solo admins pueden ver todos los usuarios
  @UseGuards(AdminGuard)
  @Get()
  list() {
    return this.users.list();
  }
}



import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  profile(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, createdAt: true } });
  }
  // A01: UpdateUserDto con whitelist — solo name es editable
  update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data });
  }
  list() {
    return this.prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } });
  }
}

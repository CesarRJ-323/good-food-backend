import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DishesModule } from './dishes/dishes.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReservationsModule } from './reservations/reservations.module';
import { DeliveryModule } from './delivery/delivery.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    // A04: Rate limiting (OWASP). Desactivable en tests con DISABLE_THROTTLE=1
    // para no bloquear los tests de integración (producción lo deja activo).
    ...(process.env.DISABLE_THROTTLE === '1'
      ? []
      : [ThrottlerModule.forRoot([{
          ttl: parseInt(process.env.THROTTLE_TTL ?? '900', 10),
          limit: parseInt(process.env.THROTTLE_LIMIT ?? '5', 10),
        }])]),
    RedisModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    DishesModule,
    ReviewsModule,
    FavoritesModule,
    ReservationsModule,
    DeliveryModule,
  ],
  providers: [
    // A04: Rate limiting global (OWASP). Se desactiva junto con el módulo
    // cuando DISABLE_THROTTLE=1 (solo para tests de integración).
    ...(process.env.DISABLE_THROTTLE === '1'
      ? []
      : [{ provide: APP_GUARD, useClass: ThrottlerGuard }]),
  ],
})
export class AppModule {}

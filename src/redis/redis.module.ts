import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';

export const REDIS = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (): Redis | null => {
        if (!process.env.REDIS_URL) {
          return null;
        }
        try {
          return new Redis(process.env.REDIS_URL);
        } catch {
          return null;
        }
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}

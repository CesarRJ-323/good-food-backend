import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { HttpExceptionFilter } from './common/exception-filter';

type LRUEntry = { count: number; ts: number };
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 7;
const throttleMap = new Map<string, LRUEntry>();

function throttle(req: any, res: any, next: any) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const path = req.url || '';
  if (!/^\/(api\/auth\/(login|resend-verification|forgot-password|reset-password))$/.test(path)) {
    return next();
  }
  const now = Date.now();
  const entry = throttleMap.get(ip);
  if (!entry || now - entry.ts > WINDOW_MS) {
    throttleMap.set(ip, { count: 1, ts: now });
    return next();
  }
  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({ message: 'Demasiados intentos. Esperá 15 minutos.' });
  }
  entry.count += 1;
  return next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // A05: Security headers via Helmet
  app.use(helmet());

  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          ...(process.env.CORS_ORIGIN ?? '')
            .split(',')
            .map((o: string) => o.trim())
            .filter(Boolean),
          // Origen del propio backend (para llamadas fetch desde el frontend tunelizado)
          ...(process.env.BACKEND_PUBLIC_URL ?? '')
            .split(',')
            .map((o: string) => o.trim())
            .filter(Boolean),
        ],
        fontSrc: ["'self'", "data:"],
        frameAncestors: ["'none'"],
      },
    }),
  );
  app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
  app.use(helmet.permittedCrossDomainPolicies({ permittedPolicies: 'none' }));

  // A05: Cookie parser para refresh tokens
  app.use(cookieParser());

  app.use(express.json({ limit: '100kb' }));

  // A05: CORS restrictivo — solo orígenes permitidos.
  // Además de los orígenes explícitos del .env, se aceptan los túneles
  // efímeros de Cloudflare (*.trycloudflare.com) para que la demo no se
  // rompa cada vez que el túnel rota la URL pública.
  const envOrigins = process.env.CORS_ORIGIN || '';
  const allowedOrigins = envOrigins
    .split(',')
    .map((o: string) => o.trim())
    .filter(Boolean);

  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true; //_same-origin / peticiones sin Origin (curl, server-to-server)
    if (allowedOrigins.includes(origin)) return true;
    // Túneles efímeros de Cloudflare (frontend y backend vía trycloudflare)
    if (/\.trycloudflare\.com$/.test(origin)) return true;
    return false;
  };

  if (allowedOrigins.length === 0) {
    console.warn('CORS_ORIGIN vacío: solo se permiten túneles *.trycloudflare.com y same-origin.');
  }

  app.use(cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    }),
  );

  app.use(throttle);

  app.setGlobalPrefix('api');

  // A05: CSRF cookie + header para requests mutantes (solo métodos no seguros)
  const noCsrfPaths = /^\/api\/(auth\/(login|resend-verification)|delivery\/orders|reservations)$/;
  app.use((req: any, res: any, next: any) => {
    // Métodos seguros y rutas excluidas no requieren token CSRF
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || noCsrfPaths.test(req.url || '')) {
      return next();
    }
    const cookieToken = req.cookies?.gf_csrf;
    const headerToken = req.headers['x-csrf-token'];
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ message: 'CSRF token inválido o ausente.' });
    }
    next();
  });

  // A03: ValidationPipe global — valida y sanitiza todos los inputs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // A05: Exception filter global — sanitiza errores para no filtrar info interna
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();

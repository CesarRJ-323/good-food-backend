import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // A09: Log de eventos de auth para auditoría
  private async auditLog(userId: string | null, action: string, ip?: string) {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, ip },
      });
    } catch {
      // No fallar el flujo si el log falla
    }
  }

  // Genera código de 6 dígitos
  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Crea y guarda un código de verificación, invalidando los anteriores del mismo tipo
  private async createVerificationCode(userId: string, type: string): Promise<string> {
    // Invalidar códigos anteriores del mismo tipo
    await this.prisma.verificationCode.updateMany({
      where: { userId, type, used: false },
      data: { used: true },
    });

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await this.prisma.verificationCode.create({
      data: { userId, code, type, expiresAt },
    });

    return code;
  }

  async register(dto: RegisterDto, ip?: string) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name, provider: 'email' },
      select: { id: true, email: true, name: true, provider: true, createdAt: true, emailVerified: true },
    });

    // Generar código de verificación
    const code = await this.createVerificationCode(user.id, 'email_verification');

    await this.auditLog(user.id, 'REGISTER', ip);
    this.logger.log(`Nuevo registro userId=${user.id}`);

    return {
      user,
      message: 'Te enviamos un código de verificación. Ingresalo para activar tu cuenta.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new BadRequestException('No existe una cuenta con ese email.');
    }
    if (user.emailVerified) {
      throw new BadRequestException('Esta cuenta ya está verificada.');
    }

    const record = await this.prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        type: 'email_verification',
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('El código es inválido o expiró.');
    }

    await this.prisma.$transaction([
      this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { used: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
    ]);

    await this.auditLog(user.id, 'EMAIL_VERIFIED', ip);
    this.logger.log(`Email verificado userId=${user.id}`);

    const tokens = await this.issueTokens(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name, emailVerified: true },
      tokens,
      message: 'Cuenta verificada correctamente.',
    };
  }

  async resendVerificationCode(email: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // No revelar si el email existe
      return { message: 'Si la cuenta existe, te enviamos un nuevo código.' };
    }
    if (user.emailVerified) {
      return { message: 'Esta cuenta ya está verificada.' };
    }

    const code = await this.createVerificationCode(user.id, 'email_verification');
    await this.auditLog(user.id, 'RESEND_VERIFICATION', ip);
    this.logger.log(`Código reenviado userId=${user.id}`);

    return {
      message: 'Te enviamos un nuevo código de verificación.',
    };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // A07: Mismo mensaje genérico para no revelar si el email existe
    if (!user?.passwordHash) {
      this.logger.warn(`Login fallido — IP: ${ip}`);
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      this.logger.warn(`Login fallido (password incorrecto) — IP: ${ip}`);
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    await this.auditLog(user.id, 'LOGIN', ip);
    return {
      user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
      tokens: await this.issueTokens(user.id, user.email),
    };
  }

  async demoLogin(ip?: string) {
    const demoEmail = 'demo@goodfood.test';
    let user = await this.prisma.user.findUnique({ where: { email: demoEmail } });
    if (!user) {
      const passwordHash = await bcrypt.hash('Demo1234', 12);
      user = await this.prisma.user.create({
        data: { email: demoEmail, passwordHash, name: 'Usuario Demo', provider: 'email', emailVerified: true },
      });
    }
    await this.auditLog(user.id, 'DEMO_LOGIN', ip);
    return {
      user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
      tokens: await this.issueTokens(user.id, user.email),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, provider: true, createdAt: true, emailVerified: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    // Stats del usuario
    const [reviews, reservations, orders, favorites] = await Promise.all([
      this.prisma.review.count({ where: { userId } }),
      this.prisma.reservation.count({ where: { userId } }),
      this.prisma.deliveryOrder.count({ where: { userId } }),
      this.prisma.review.count({ where: { userId, rating: 5 } }),
    ]);

    return {
      ...user,
      stats: { reviews, reservations, orders, favorites },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, ip?: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: { id: true, email: true, name: true, provider: true, emailVerified: true, createdAt: true },
    });
    await this.auditLog(userId, 'PROFILE_UPDATED', ip);
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException('No se puede cambiar la contraseña.');
    }

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await this.auditLog(userId, 'PASSWORD_CHANGED', ip);
    return { message: 'Contraseña actualizada correctamente.' };
  }

  async issueTokens(userId: string, email: string) {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    // A02: Sin fallbacks — si no hay secret, no se inicia
    if (!jwtSecret || !refreshSecret) {
      throw new Error('Faltan JWT_SECRET y REFRESH_TOKEN_SECRET en .env');
    }
    const payload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, sessionId: session.id };
  }

  async refresh(token: string, ip?: string) {
    if (!token) throw new UnauthorizedException('Sesión inválida o expirada.');

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    const jwtSecret = process.env.JWT_SECRET;
    if (!refreshSecret || !jwtSecret) {
      throw new Error('Faltan secrets en .env');
    }

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const userId = payload.sub as string;

    // A02: Buscar TODAS las sesiones activas del usuario y validar el hash
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, refreshTokenHash: true },
    });

    let validSession = null;
    for (const s of sessions) {
      if (await bcrypt.compare(token, s.refreshTokenHash)) {
        validSession = s;
        break;
      }
    }

    if (!validSession) {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    // Rotación: borrar la sesión vieja, crear nueva
    await this.prisma.session.delete({ where: { id: validSession.id } }).catch(() => {});

    const newPayload = { sub: userId, email: payload.email };
    const accessToken = await this.jwt.signAsync(newPayload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });
    const newRefreshToken = await this.jwt.signAsync(newPayload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: await bcrypt.hash(newRefreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.auditLog(userId, 'TOKEN_REFRESH', ip);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logoutByToken(token: string, ip?: string) {
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    if (!refreshSecret) return;

    try {
      const payload = await this.jwt.verifyAsync(token, { secret: refreshSecret });
      const userId = payload?.sub as string | undefined;
      if (!userId) return;

      // A02: Validar hash antes de borrar
      const sessions = await this.prisma.session.findMany({
        where: { userId, expiresAt: { gt: new Date() } },
        select: { id: true, refreshTokenHash: true },
      });

      for (const s of sessions) {
        if (await bcrypt.compare(token, s.refreshTokenHash)) {
          await this.prisma.session.delete({ where: { id: s.id } }).catch(() => {});
          await this.auditLog(userId, 'LOGOUT', ip);
          break;
        }
      }
    } catch {
      // Token inválido — nada que borrar
    }
  }
}

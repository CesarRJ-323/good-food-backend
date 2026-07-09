import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Get, Patch, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(token: string, res: Response) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private getClientIp(req: Request): string | undefined {
    return req.ip || req.headers['x-forwarded-for'] as string | undefined;
  }

  @Post('register')
  async register(@Req() req: Request, @Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto, this.getClientIp(req));
    const tokens = (result as any)?.tokens;
    if (tokens?.refreshToken) this.setRefreshTokenCookie(tokens.refreshToken, res);
    if (tokens?.refreshToken) delete (tokens as any).refreshToken;
    return result;
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Req() req: Request, @Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto, this.getClientIp(req));
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body('email') email: string, @Req() req: Request) {
    return this.authService.resendVerificationCode(email, this.getClientIp(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto, this.getClientIp(req));
    this.setRefreshTokenCookie((tokens as any).refreshToken, res);
    // Don't return refreshToken in payload
    const { refreshToken, ...rest } = tokens as any;
    return rest;
  }

  @Get('demo-user')
  demoUser(@Req() req: Request) {
    return this.authService.demoLogin(this.getClientIp(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Body('refreshToken') bodyToken: string, @Res({ passthrough: true }) res: Response) {
    const cookieToken = req.cookies?.refreshToken;
    const refreshToken = bodyToken || cookieToken;
    if (!refreshToken) throw new UnauthorizedException('No hay sesión');
    const tokens = await this.authService.refresh(refreshToken, this.getClientIp(req));

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Body('refreshToken') bodyToken: string, @Res({ passthrough: true }) res: Response) {
    const cookieToken = req.cookies?.refreshToken;
    const refreshToken = bodyToken || cookieToken;
    if (refreshToken) await this.authService.logoutByToken(refreshToken, this.getClientIp(req));
    res.clearCookie('refreshToken', { path: '/' });
    return { ok: true };
  }

  @Get('csrf-token')
  csrfToken(@Res({ passthrough: true }) res: Response) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie('gf_csrf', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { csrfToken: token };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user?: { id: string; email: string } }) {
    return this.authService.me(req.user!.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request & { user?: { id: string; email: string } }) {
    return this.authService.getProfile(req.user!.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Req() req: Request & { user?: { id: string; email: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user!.id, dto, this.getClientIp(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Req() req: Request & { user?: { id: string; email: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user!.id, dto, this.getClientIp(req));
  }
}

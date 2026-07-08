// DONE: Paso 10 - endpoints de auth
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';
import type { JwtUser } from '../../common/decorators/auth.decorators';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dtos';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Sesión actual (el front lo usa para hidratar el estado) */
  @Get('me')
  me(@CurrentUser() user?: JwtUser) {
    return user ?? { dev: true, note: 'sin token (vía x-tenant-id de desarrollo)' };
  }
}

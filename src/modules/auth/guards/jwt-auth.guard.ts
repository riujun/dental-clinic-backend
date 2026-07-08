// DONE: Paso 10 - guard global JWT: todo endpoint exige Bearer token salvo @Public()
// En desarrollo se tolera el header x-tenant-id SIN token (workflow de pruebas);
// en producción esa vía queda deshabilitada.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY, JwtUser } from '../../../common/decorators/auth.decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtUser; tenantId?: string }>();

    const token = this.extractBearer(req);
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtUser>(token);
        req.user = payload;
        req.tenantId = payload.tenantId; // consumido por @TenantId()
        return true;
      } catch {
        throw new UnauthorizedException('Token inválido o expirado');
      }
    }

    // Vía de desarrollo sin token: solo fuera de producción y con x-tenant-id
    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    if (isDev && req.headers['x-tenant-id']) return true;

    throw new UnauthorizedException('Se requiere token Bearer');
  }

  private extractBearer(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
